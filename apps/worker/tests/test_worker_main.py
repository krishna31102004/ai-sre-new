import time

from glassbox_sre_worker import main


def test_worker_writes_expiring_heartbeat(monkeypatch) -> None:
    recorded: dict[str, object] = {}

    class FakeRedis:
        def set(self, key: str, value: str, ex: int) -> None:
            recorded.update({"key": key, "value": value, "ex": ex})

    monkeypatch.setattr(main, "redis_client", FakeRedis())

    main.write_heartbeat()

    assert recorded["key"] == main.WORKER_HEARTBEAT_KEY
    assert float(str(recorded["value"])) <= time.time()
    assert recorded["ex"] == 30
