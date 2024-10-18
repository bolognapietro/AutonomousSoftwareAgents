import { client } from './client_config.js';
import Me from './me.js';
import { distance, findNearestDeliveryPoint, isValidPosition, findPointsAtDistance } from './support_fn.js';
import IntentionRevision from './intention_rev.js';
import IntentionRevisionReplace from './intention_rev.js';

var me = new Me();
const parcels = new Map();

client.onYou( ( {id, name, x, y, score} ) => {  // Event listener triggered when the client receives data about the current agent.    
    me.setInfos( {id, name, x, y, score} );
    myAgent.me = me;
} );

const myAgent = new IntentionRevisionReplace(me);
myAgent.loop();

client.onParcelsSensing( async ( perceived_parcels ) => {
    let count = 0;
    for (const p of perceived_parcels) {
        parcels.set( p.id, p)
        me.perceiveParticle(p.id, p); 
        if (p.carriedBy == me.id) {
            count++;
        }
    }

    me.numParticelsCarried = count;
    if (me.numParticelsCarried > 0) {
        me.particelsCarried = true;
    }

    // -------------------

    const options = [];
    
    for (const parcel of parcels.values()) {
        if (!parcel.carriedBy) {
            options.push(['go_pick_up', parcel.x, parcel.y, parcel.id]);
        }
    }

    let best_option;
    let nearest = Number.MAX_VALUE;
    for (const option of options) {
        if (option[0] === 'go_pick_up') {
            let [go_pick_up, x, y, id] = option;
            let current_d = distance({x, y}, me);
            if (current_d < nearest) {
                best_option = option;
                nearest = current_d;
            }
        }
    }

    // Filtra le opzioni che contengono 'go_pick_up'
    let goPickUpOptions = options.filter(option => option[0] === 'go_pick_up');

    // Ordina le opzioni filtrate in base alla distanza
    goPickUpOptions.sort((a, b) => {
        let distanceA = distance({ x: a[1], y: a[2] }, me);
        let distanceB = distance({ x: b[1], y: b[2] }, me);
        return distanceA - distanceB;
    });

    // Esegui il ciclo for sulle opzioni ordinate
    for (const option of goPickUpOptions) {
        let [go_pick_up, x, y, id] = option;
        let current_d = distance({ x, y }, me);
        if (current_d < nearest) {
            best_option = option;
            nearest = current_d;
        }
    }

    if ( myAgent.me.particelsCarried ) {
        let deliveryPoint = findNearestDeliveryPoint(me, deliveryPoints, false);
        myAgent.push(['go_put_down', deliveryPoint.x, deliveryPoint.y]);
    }
    else if ( best_option ) {
        myAgent.push(best_option);
    }
} )

const position_agents  = {}

client.onAgentsSensing( ( agents ) => {

    position_agents.x = agents.map( ( {x} ) => {
        return x
    } );
    position_agents.y = agents.map( ( {y} ) => {
        return y
    } );
    // console.log( position_agents)
} )
