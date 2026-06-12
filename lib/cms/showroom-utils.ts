export function hotspotHref(type: string, target: string): string {
  switch (type) {
    case "furniture":
      return `/furniture/${target}`;
    case "material":
      return `/materials#${target}`;
    case "project":
      return `/projects/${target}`;
    default:
      return target.startsWith("http") ? target : target.startsWith("/") ? target : `/${target}`;
  }
}
