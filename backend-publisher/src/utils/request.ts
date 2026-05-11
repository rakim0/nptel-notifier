import { HTTP_METHOD_GET } from "../constants";

export function isGetRequest(request: Request): boolean {
  return request.method === HTTP_METHOD_GET;
}

export function isRoute(url: URL, route: string): boolean {
  return url.pathname === route;
}
