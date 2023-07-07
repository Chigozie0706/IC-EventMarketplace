import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Event = Record<{
    id: string;
    eventTitle: string;
    eventDescription: string;
    eventCardImgUrl: string;
    eventDate: string;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
}>

type EventPayload = Record<{
    eventTitle: string;
    eventDescription: string;
    eventCardImgUrl: string;
    eventDate: string;
}>

const eventStorage = new StableBTreeMap<string, Event>(0, 44, 1024);

$query;
export function getAllEvents(): Result<Vec<Event>, string> {
    return Result.Ok(eventStorage.values());
}

$query;
export function getEventById(id: string): Result<Event, string> {
    return match(eventStorage.get(id), {
        Some: (event) => Result.Ok<Event, string>(event),
        None: () => Result.Err<Event, string>(`a message with id=${id} not found`)
    });
}

$update;
export function addMessage(payload: EventPayload): Result<Event, string> {
    const event: Event = { id: uuidv4(), createdAt: ic.time(), updatedAt: Opt.None, ...payload };
    eventStorage.insert(event.id, event);
    return Result.Ok(event);
}

$update;
export function updateEvent(id: string, payload: EventPayload): Result<Event, string> {
    return match(eventStorage.get(id), {
        Some: (event) => {
            const updatedEvent: Event = {...event, ...payload, updatedAt: Opt.Some(ic.time())};
            eventStorage.insert(event.id, updatedEvent);
            return Result.Ok<Event, string>(updatedEvent);
        },
        None: () => Result.Err<Event, string>(`couldn't update a message with id=${id}. message not found`)
    });
}

$update;
export function deleteEvent(id: string): Result<Event, string> {
    return match(eventStorage.remove(id), {
        Some: (deletedEvent) => Result.Ok<Event, string>(deletedEvent),
        None: () => Result.Err<Event, string>(`couldn't delete a message with id=${id}. message not found.`)
    });
}

// a workaround to make uuid package work with Azle
globalThis.crypto = {
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    }
};