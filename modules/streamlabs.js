const EventEmitter = require('events');
const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
const {
    Client
} = require('pg');

const clientpg = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

clientpg.connect();

var obj = new EventEmitter.EventEmitter();

module.exports = obj;

//clientpg.query(`UPDATE vars SET value = '140329518' WHERE name = 'streamlabs';`);

async function scrap() {

    var random = Math.floor(Math.random() * 3000);
    setTimeout(scrap, 5000 + random);

    var stop = false;

    var lastID = 0;
    await clientpg.query(`SELECT value FROM vars WHERE name='streamlabs';`)
        .then(res => {
            lastID = parseInt(res.rows[0].value);
        })
        .catch(err => {
            console.log("Erreur Postgres SELECT");
            console.error(err);
            stop = true;
        });

    if (stop) return;

    const data = null;

    const xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", function () {
        if (this.readyState === this.DONE) {
            const dons = JSON.parse(this.responseText).data;

            if (dons.length != 0) {
                clientpg.query(`UPDATE vars SET value = '${dons[0].donation_id}' WHERE name = 'streamlabs';`)
                    .then(res => {
                        console.log(`\nEnvoi de ${dons.length} nouveau(x) don(s)`);
                        console.log(dons);
                        obj.emit('newDons', dons);
                    })
                    .catch(err => {
                        console.log("Erreur Postgres UPDATE");
                        console.error(err);
                    });
            }
        }
    });


    xhr.open("GET", `https://streamlabs.com/api/v1.0/donations?access_token=${process.env.STREAMLABS_ACCESS_TOKEN}&after=${lastID}`);

    xhr.send(data);

}

setTimeout(scrap, 5000);