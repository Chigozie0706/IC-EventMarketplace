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

// fetches all events created
$query;
export function getAllEvents(page: number, pageSize: number): Result<Vec<Event>, string> {
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const events = eventStorage.values().slice(startIdx, endIdx);
    return Result.Ok(events);
}


// fetches an event by it's id
$query;
export function getEventById(id: string): Result<Event, string> {
    return match(eventStorage.get(id), {
        Some: (event) => Result.Ok<Event, string>(event),
        None: () => Result.Err<Event, string>(`an event with id=${id} not found`)
    });
}


// function that used to create an event
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


// function that updates an event by it's id
$update;
export function updateEvent(id: string, payload: EventPayload): Result<Event, string> {
    return match(eventStorage.get(id), {
        Some: (event) => {
            const updatedEvent: Event = {...event, ...payload, updatedAt: Opt.Some(ic.time())};
            eventStorage.insert(event.id, updatedEvent);
            return Result.Ok<Event, string>(updatedEvent);
        },
        None: () => Result.Err<Event, string>(`couldn't update the event with id=${id}. event not found`)
    });
}



/**
 * function that allows an event owner to delete his/her event
 * by it's id 
*/ 
$update
export function deleteEventById (id: string): Result<Event, string> {
    return match(eventStorage.get(id), {
        Some: (deletedEvent) => {

            // checks if the caller is not the same as the owner of the event
            if(deletedEvent.owner.toString() !== ic.caller().toString()){
                return Result.Err<Event, string>("You are not the owner of this event")
            }

            // removes that particular event
            eventStorage.remove(id)
            return Result.Ok<Event, string>(deletedEvent)
        },
        None: () => Result.Err<Event, string>(`couldn't delete the event with id=${id}. event not found.`)
    })
}


// function that allows users to rsvp an event
$update;
export function attendAnEvent (id: string): Result<Event, string> {
    const event = match(eventStorage.get(id), {
        Some: (event) => {

        // gets the caller's address of the smart contract and converts it to string 
            const caller = ic.caller().toString()

        // checks if that caller is already in the attendees list
            if(event.attendees.includes(caller)) {
                return Result.Ok<Event, string>(event)
            } 
            else { 
        // gets the attendees list 
            const attendees: Vec<string> = event.attendees;
        // adds the caller to the attendees list
            
        // save the updated attendance list in the eventStorage 
        attendees.push(caller);
            const Event: Event = {
                    ...event,
                    attendees: attendees 
                }

            eventStorage.insert(event.id, Event);
        // return the event with the updated changes
                return Result.Ok<Event, string>(Event);
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