import { HTTP_METHOD_GET, HTTP_METHOD_POST } from "../constants";

export function isGetRequest(request: Request): boolean {
  return request.method === HTTP_METHOD_GET;
}

export function isPostRequest(request: Request): boolean {
  return request.method === HTTP_METHOD_POST;
}

export function isRoute(url: URL, route: string): boolean {
  return url.pathname === route;
}
