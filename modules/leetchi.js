const axios = require('axios');
const EventEmitter = require('events');
const {
    Client
} = require('pg');

const leetchID = "rE4Qjva5";
const url = "https://www.leetchi.com/fr/Fundraising/Participations";

var obj = new EventEmitter.EventEmitter();

var savedParticipations;

const clientpg = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

clientpg.connect();

module.exports = obj;

async function scrap() {
    var stop = false;

    var lastID = 0;
    await clientpg.query(`SELECT value FROM vars WHERE name='leetchi';`)
        .then(res => {
            lastID = parseInt(res.rows[0].value);
        })
        .catch(err => {
            console.log("Erreur Postgres SELECT");
            console.error(err);
            stop = true;
        });

    if (stop) return;

    const options = {
        method: "GET",
        headers: {
            'x-requested-with': 'XMLHttpRequest',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36'
        },
        data: {
            hashId: leetchID,
            lastId: undefined
        },
        url
    }

    var response;

    await axios(options)
        .then(res => {
            response = res
        })
        .catch(err => {
            console.log("ERREUR LEETCHI");
            console.error(err);
            stop = true;
        });

    if (stop) return;

    const participations = response.data.data;

    let fin = false;
    let i = 0;
    let newParticipations = [];
    while (i < participations.data.length && !fin) {
        if (participations.data[i].id > lastID) {
            participation = participations.data[i];
            participation.fullName = participation.fullName.split(" ")[0];
            newParticipations.push(participations.data[i]);
        } else
            fin = true;
        i++;
    }

    if (newParticipations.length != 0) {
        await clientpg.query(`UPDATE vars SET value = '${newParticipations[0].id}' WHERE name = 'leetchi';`)
            .catch(err => {
                console.log("Erreur Postgres UPDATE");
                console.error(err);
                stop = true;
            });
        if (stop) return;
        console.log(`\nEnvoi de ${newParticipations.length} nouveau(x) don(s)`);
        obj.emit('newParticipations', newParticipations);
    }


    var random = Math.floor(Math.random() * 3000);
    setTimeout(scrap, 5000 + random);

}

var random = Math.floor(Math.random() * 3000);
setTimeout(scrap, 5000 + random);