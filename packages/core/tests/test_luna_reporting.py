import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from glassbox_sre.benchmark_runner import (
    ModelEvalResult,
    OpenAIModelEvalClient,
    run_model_eval_benchmark,
)
from glassbox_sre.config import Settings
from glassbox_sre_worker import graph


@pytest.mark.parametrize(('value', 'expected'), [
    ({'1234567890': 'timeout'}, '12345678: timeout'),
    (['one', 'two'], 'one two'), ('text', 'text'),
])
def test_reasoning_normalization(value, expected):
    assert ModelEvalResult(reasoning=value).reasoning == expected


def test_triage_request(monkeypatch):
    client = Mock()
    triage = graph.TriageResult(alert_status='firing', summary='test')
    client.return_value.with_structured_output.return_value.invoke.return_value = {'parsed': triage}
    monkeypatch.setattr(graph, 'ChatOpenAI', client)
    node = graph._build_triage_node(Settings(_env_file=None, openai_api_key='test'))
    payload = graph.AlertmanagerWebhook.model_validate({'status': 'firing', 'alerts': []})
    assert node({'alert_payload': payload})['triage'] == triage
    kwargs = client.call_args.kwargs
    assert kwargs['model'] == 'gpt-6-luna'
    assert kwargs['reasoning'] == {'effort': 'low'}
    assert kwargs['use_responses_api'] is True
    assert 'temperature' not in kwargs
    assert client.return_value.with_structured_output.call_args.kwargs['method'] == 'json_schema'


def test_invalid_payload_preserves_usage_in_run(tmp_path, monkeypatch):
    root = Path(__file__).resolve().parents[3]
    view = tmp_path / 'scenarios'
    view.mkdir()
    (view / 'test').symlink_to(root / 'scenarios/benchmark/frontend-ad-failure-visible-500s')
    client = OpenAIModelEvalClient(Settings(_env_file=None, openai_api_key='test'))
    monkeypatch.setattr(client.client.responses, 'create', Mock(return_value=SimpleNamespace(
        output_text='{}', usage=SimpleNamespace(input_tokens=100, output_tokens=30,
        total_tokens=130, output_tokens_details=SimpleNamespace(reasoning_tokens=20)))))
    output = run_model_eval_benchmark(view, root, root / 'runbooks', tmp_path / 'artifacts', client)
    summary = json.loads((output / 'summary.json').read_text())
    assert summary['failed_runs'] == 1
    assert (summary['input_tokens'], summary['output_tokens'], summary['total_tokens'],
            summary['reasoning_tokens']) == (100, 30, 130, 20)
    assert summary['output_format'] == 'strict_json_schema'
    assert 'local_lexical_not_pgvector' in (output / 'summary.md').read_text()
