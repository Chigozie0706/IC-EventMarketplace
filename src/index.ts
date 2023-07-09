import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt, Principal } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Event = Record<{
    owner: Principal;
    id: string;
    eventTitle: string;
    eventDescription: string;
    eventCardImgUrl: string;
    eventLocation: string;
    attendees: Vec<string>;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
}>;

type EventPayload = Record<{
    eventTitle: string;
    eventDescription: string;
    eventCardImgUrl: string;
    eventDate: string;
    eventLocation: string;
}>;

const eventStorage = new StableBTreeMap<string, Event>(0, 44, 1024);

// Fetches all events created with pagination support
$query;
export function getAllEvents(page: number, pageSize: number): Result<Vec<Event>, string> {
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const events = eventStorage.values().slice(startIdx, endIdx);
    return Result.Ok(events);
}

// Fetches an event by its id
$query;
export function getEventById(id: string): Result<Event, string> {
    return match(eventStorage.get(id), {
        Some: (event) => Result.Ok<Event, string>(event),
        None: () => Result.Err<Event, string>(`An event with id=${id} not found`)
    });
}

// Function to create an event with input validation
$update;
export function addEvent(payload: EventPayload): Result<Event, string> {
    const { eventTitle, eventDescription, eventCardImgUrl, eventDate, eventLocation } = payload;

    // Input validation
    if (!eventTitle || !eventDescription || !eventCardImgUrl || !eventDate || !eventLocation) {
        return Result.Err<Event, string>('Missing required fields');
    }

    const event: Event = {
        owner: ic.caller(),
        id: uuidv4(),
        attendees: [],
        createdAt: ic.time(),
        updatedAt: Opt.None,
        eventTitle,
        eventDescription,
        eventCardImgUrl,
        eventLocation
    };
    eventStorage.insert(event.id, event);
    return Result.Ok(event);
}

// Function to delete an event with confirmation
$update;
export function deleteEventById(id: string, confirmationToken: string): Result<Event, string> {
    if (confirmationToken !== 'CONFIRM') {
        return Result.Err<Event, string>('Invalid confirmation token');
    }

    return match(eventStorage.get(id), {
        Some: (deletedEvent) => {
            // Checks if the caller is not the same as the owner of the event
            if (!Principal.equal(deletedEvent.owner, ic.caller())) {
                return Result.Err<Event, string>('You are not the owner of this event');
            }

            // Removes the event
            eventStorage.remove(id);
            return Result.Ok<Event, string>(deletedEvent);
        },
        None: () => Result.Err<Event, string>(`Couldn't delete the event with id=${id}. Event not found.`)
    });
}
