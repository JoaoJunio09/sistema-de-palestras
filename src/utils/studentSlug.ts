const FALLBACK_SLUG = "aluno";

export function createStudentSlug(fullName: string) {
  const normalizedName = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();

  return normalizedName || FALLBACK_SLUG;
}

export function buildStudentPanelPath(slug: string) {
  return `/${slug}`;
}
