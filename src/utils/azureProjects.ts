export function getNewMillProjects(): string[] {
  const rawProjects = (import.meta.env.VITE_AZURE_DEVOPS_PROJECTS || 'Product') as string;
  return rawProjects
    .split(',')
    .map((project) => project.trim())
    .filter((project) => project.length > 0);
}



