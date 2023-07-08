import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt, Principal } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Event = Record<{
    owner : Principal;
    id: string;
    eventTitle: string;
    eventDescription: string;
    eventCardImgUrl: string;
    eventLocation: string;
    attendees : Vec<string>;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
}>

type EventPayload = Record<{
    eventTitle: string;
    eventDescription: string;
    eventCardImgUrl: string;
    eventDate: string;
    eventLocation : string;
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
export function addEvent(payload: EventPayload): Result<Event, string> {
    const event: Event = { owner: ic.caller(), id: uuidv4(), attendees : [], createdAt: ic.time(), updatedAt: Opt.None, ...payload };
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
    return match(eventStorage.get(id), {
        Some: (deletedEvent) => {
        if(deletedEvent.owner.toString() !== ic.caller().toString()){
            return Result.Err<Event, string>("You are not the owner of this event")
        }
        eventStorage.remove(id)
        Result.Ok<Event, string>(deletedEvent)
    },
        None: () => Result.Err<Event, string>(`couldn't delete a message with id=${id}. message not found.`)
    });
}


$update;
export function attendAnEvent(userId: string): Result<Event, string> {
    // Get the user profile requesting the follow
    const event = match(eventStorage.get(userId), {
        Some: (event) => {
            // Check if the event is already following the account to be followed
            // Return the event profile if account to be followed is already being followed
            const caller = ic.caller().toString()
            if(event.attendees.includes(caller)) {
                return Result.Ok<Event, string>(event)
            } else { // Else run the code below
                // Save the user's initial following in a variable
                const attendees: Vec<string> = event.attendees;
                // Add the new user to be followed to the existing users already followed
                attendees.push(caller);

                const user1Profile: Event = {
                    ...event,
                    attendees: attendees // Assign the following variable to the list all of the users followed including the new user
                }
                // Save the current user's updated status in the userProfileStorage
                eventStorage.insert(event.id, user1Profile);
                // Return the user's profile with the updated changes
                return Result.Ok<Event, string>(user1Profile);
            }
        },
        None: () => Result.Err<Event, string>("Unable to carry out the following function")
    })

    return event
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