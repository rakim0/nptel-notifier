export function isGetRequest(request: Request): boolean {
  return request.method === "GET";
}

export function isRoute(url: URL, route: string): boolean {
  return url.pathname === route;
}
