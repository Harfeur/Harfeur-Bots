const axios = require('axios');
const EventEmitter = require('events');

const leetchID = "rE4Qjva5";
const url = "https://www.leetchi.com/fr/Fundraising/Participations";

var obj = new EventEmitter.EventEmitter();

var savedParticipations;

module.exports = obj;

async function scrap() {
    const options = {
        method: "GET",
        headers: {
            'x-requested-with': 'XMLHttpRequest'
        },
        data: {
            hashId: leetchID,
            lastId: 'undefined'
        },
        url
    }

    const response = await axios(options);
    const participations = response.data.data;
    if (participations != undefined) {
        if (savedParticipations == undefined) {
            savedParticipations = participations
        } else {
            let newParticipations = [];
            let lastID = savedParticipations.data[0].id;
            let fin = false;
            let i = 0;
            while (i < participations.data.length && !fin) {
                if (participations.data[i].id != lastID)
                    newParticipations.push(participations.data[i]);
                else
                    fin = true;
                i++;
            }

            if (newParticipations.length != 0)
                obj.emit('newParticipations', newParticipations);
        }
    }

}

setInterval(scrap, 5000);