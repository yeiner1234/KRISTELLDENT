interface BranchLike {
  id: string;
  name: string;
  active: boolean;
}

// Sedes donde la profesional puede tener horario o turnos extra: las que tiene
// asignadas y están activas. Una sede inactiva no ofrece horarios al público.
export function activeBranchesOf(branchIds: string[], branches: BranchLike[]): { id: string; name: string }[] {
  return branches
    .filter((branch) => branch.active && branchIds.includes(branch.id))
    .map((branch) => ({ id: branch.id, name: branch.name }));
}
