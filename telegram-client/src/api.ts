export interface CourseQuery {
  id: string;
  courseQuery: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public url: string,
    public responseBody: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  toDiagnostic(): string {
    return [
      `❌ ${this.message}`,
      `URL: ${this.url}`,
      `Status: ${this.status}`,
      `Body: ${this.responseBody}`,
    ].join("\n");
  }
}

export class BackendApi {
  constructor(private backend: Fetcher) {}

  async createSubscriber(chatId: number): Promise<string> {
    const path = "/subscribers";
    const response = await this.backend.fetch(
      new Request(`https://backend${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactType: "telegram",
          contactValue: String(chatId),
        }),
      }),
    );

    if (!response.ok) {
      const body = await response.text();
      throw new ApiError("Failed to create subscriber", response.status, path, body);
    }

    const body = await response.json() as { subscriber: { id: string } };
    return body.subscriber.id;
  }

  async listCourseQueries(subscriberId: string): Promise<CourseQuery[]> {
    const path = `/subscribers/${subscriberId}/course-queries`;
    const response = await this.backend.fetch(
      new Request(`https://backend${path}`),
    );

    if (!response.ok) {
      const body = await response.text();
      throw new ApiError("Failed to list course queries", response.status, path, body);
    }

    const body = await response.json() as { courseQueries: CourseQuery[] };
    return body.courseQueries;
  }

  async addCourseQuery(
    subscriberId: string,
    query: string,
  ): Promise<CourseQuery> {
    const path = `/subscribers/${subscriberId}/course-queries`;
    const response = await this.backend.fetch(
      new Request(`https://backend${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseQuery: query }),
      }),
    );

    if (!response.ok) {
      const body = await response.text();
      throw new ApiError("Failed to add course query", response.status, path, body);
    }

    const body = await response.json() as { courseQuery: CourseQuery };
    return body.courseQuery;
  }

  async removeCourseQuery(
    subscriberId: string,
    queryId: string,
  ): Promise<void> {
    const path = `/subscribers/${subscriberId}/course-queries/${queryId}`;
    const response = await this.backend.fetch(
      new Request(`https://backend${path}`, { method: "DELETE" }),
    );

    if (!response.ok) {
      const body = await response.text();
      throw new ApiError("Failed to remove course query", response.status, path, body);
    }
  }
}
