from glassbox_sre.dependency_graph import (
    affected_services_from_alert,
    default_service_dependency_graph,
)


def test_default_dependency_graph_contains_frontend_to_ad() -> None:
    graph = default_service_dependency_graph()

    assert graph.downstream("frontend") == ("ad",)
    assert graph.upstream("ad") == ("frontend",)


def test_affected_services_for_frontend_include_ad() -> None:
    graph = default_service_dependency_graph()

    assert affected_services_from_alert("frontend", graph) == ("frontend", "ad")
