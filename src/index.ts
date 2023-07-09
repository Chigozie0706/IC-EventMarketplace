import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt, Principal, nat8 } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Event = Record<{
    owner : Principal;
    id: string;
    eventTitle: string;
    eventDescription: string;
    eventCardImgUrl: string;
    eventLocation: string;
    attendees : Vec<string>;
    eventDate: nat64;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
    maxNumber: nat8;
    reviews: Vec<string>;
}>

type EventPayload = Record<{
    eventTitle: string;
    eventDescription: string;
    eventCardImgUrl: string;
    eventDate: nat64;
    eventLocation : string;
    maxNumber: nat8;
}>

const eventStorage = new StableBTreeMap<string, Event>(0, 44, 1024);

// fetches all events created
$query;
export function getAllEvents(): Result<Vec<Event>, string> {
    return Result.Ok(eventStorage.values());
}


// fetches an event by it's id
$query;
export function getEventById(id: string): Result<Event, string> {
    return match(eventStorage.get(id), {
        Some: (event) => Result.Ok<Event, string>(event),
        None: () => Result.Err<Event, string>(`an event with id=${id} not found`)
    });

}


//get all previous events that the user attended 
$query;
export function getMyAttendedEvents(): Vec<Event>{
    const caller = ic.caller().toString();
    return eventStorage.values().filter((event) => event.attendees.includes(caller))
}

//get all events by the organizer
$query;
export function getAllEventsByOrganizer(organizer: string): Vec<Event>{
    return eventStorage.values().filter((event) => event.owner === Principal.fromText(organizer) )

}

//add a review by the attendee
$update;
export function addReview(id: string, review: string): Result<string, string>{
    if(review.length === 0){
        return Result.Err<string,string>("You cant leave an empty review")
    }

    return match(eventStorage.get(id),{
        None:()=> Result.Err<string,string>("an event with id=${id} not found"),
        Some:(event)=>{
            const caller = ic.caller().toString()

            if(!event.attendees.includes(caller)){
                return Result.Err<string,string>(`You are not among the attendees for the event with id=${id}`)
            }

            let allReviews = event.reviews;
            allReviews.push(review)

            const updatedEvent : Event = {...event, reviews: allReviews};
            eventStorage.insert(id,updatedEvent);

            return Result.Ok<string,string>("Review added successfully")
        }
    });
}


//return either expired or running events
$query;
export function getSpecificEvents(isRunning: boolean): Vec<Event>{
    const currentTime = ic.time();
    if(isRunning){
        return eventStorage.values().filter((event) => event.eventDate > currentTime)
    }else{
        return eventStorage.values().filter((event) => event.eventDate < currentTime)
    } 
}

// function that used to create an event
$update;
export function addEvent(payload: EventPayload): Result<Event, string> {
    const event: Event = { owner: ic.caller(), id: uuidv4(), attendees : [], createdAt: ic.time(), updatedAt: Opt.None, ...payload,reviews: [] };
    eventStorage.insert(event.id, event);
    return Result.Ok(event);
}


// function that updates an event by it's id
$update;
export function updateEvent(id: string, payload: EventPayload): Result<Event, string> {
    return match(eventStorage.get(id), {
        Some: (event) => {
            const caller = ic.caller();
            if(event.owner!== caller){
                return Result.Err<Event,string>("You are not the owner of the event")
            }
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
            const maxAttendees = event.attendees.length;

        // checks if that caller is already in the attendees list
            if(event.attendees.includes(caller)) {
                return Result.Ok<Event, string>(event)
            } 
            //check if the max number of event attendees has been reached.
            else if(event.maxNumber === maxAttendees){
                return Result.Err<Event,string>("The max number of attendees has been reached");
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
