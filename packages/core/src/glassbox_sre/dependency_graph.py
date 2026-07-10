from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ServiceDependencyGraph:
    edges: dict[str, tuple[str, ...]] = field(default_factory=dict)

    def downstream(self, service_name: str) -> tuple[str, ...]:
        return self.edges.get(service_name, ())

    def upstream(self, service_name: str) -> tuple[str, ...]:
        parents: list[str] = []
        for parent, children in self.edges.items():
            if service_name in children:
                parents.append(parent)
        return tuple(sorted(parents))


def default_service_dependency_graph() -> ServiceDependencyGraph:
    return ServiceDependencyGraph(edges={"frontend": ("ad",), "checkout": ("payment",)})


def affected_services_from_alert(
    service_name: str, graph: ServiceDependencyGraph
) -> tuple[str, ...]:
    return (service_name, *graph.downstream(service_name))
