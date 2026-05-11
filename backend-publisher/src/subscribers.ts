import { SQL_INSERT_SUBSCRIBER, SQL_SELECT_SUBSCRIBERS } from "./constants";
import { createSubscriberSchema } from "./validation";

export interface Subscriber {
  id: string;
  contactType: string;
  contactValue: string;
  createdAt: string;
}

interface SubscriberRow {
  id: string;
  contact_type: string;
  contact_value: string;
  created_at: string;
}

export async function listSubscribers(db: D1Database): Promise<Subscriber[]> {
  const result = await db.prepare(SQL_SELECT_SUBSCRIBERS).all<SubscriberRow>();

  return result.results.map(mapSubscriberRow);
}

export async function createSubscriber(
  db: D1Database,
  body: unknown,
): Promise<Subscriber> {
  const requestBody = createSubscriberSchema.parse(body);
  const subscriber: Subscriber = {
    id: crypto.randomUUID(),
    contactType: requestBody.contactType,
    contactValue: requestBody.contactValue,
    createdAt: new Date().toISOString(),
  };

  await db
    .prepare(SQL_INSERT_SUBSCRIBER)
    .bind(
      subscriber.id,
      subscriber.contactType,
      subscriber.contactValue,
      subscriber.createdAt,
    )
    .run();

  return subscriber;
}

function mapSubscriberRow(row: SubscriberRow): Subscriber {
  return {
    id: row.id,
    contactType: row.contact_type,
    contactValue: row.contact_value,
    createdAt: row.created_at,
  };
}
