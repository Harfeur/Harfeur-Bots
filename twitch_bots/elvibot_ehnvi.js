const tmi = require('tmi.js');

exports.run = () => {

    const leetchi = require('../modules/leetchi.js');

    const opts = {
        connection: {
            reconnect: true
        },
        identity: {
            username: process.env.BOT_USERNAME,
            password: process.env.OAUTH_TOKEN
        },
        channels: [
            "ehnvi_"
        ]
    };

    const twitchBot = new tmi.client(opts);

    twitchBot.on('connected', (addr, port) => {
        console.log(`* Connected to ${addr}:${port} - Live d'Ehnvi`);
        //bonneAnnee();

        leetchi.on("newParticipations", participations => {
            participations.forEach(participation => {
                if (participation.showContributionAmount) {
                    var message = `${participation.fullName} vient de participer en donnant ${participation.amountFormatted} dans la cagnotte pour aider mon père ! Pour plus d'infos, écrivez !papa dans le chat ♥`;
                    var money = participation.amountFormatted.split(" ");
                    var moneyJoin = "";
                    money.forEach(str => {
                        if (str != "€") moneyJoin+=str;
                    });
                    for (let index = 0; index < parseInt(moneyJoin); index++) {
                        message+=" elviMoney";
                    }
                    while (message.length != 0) {
                        var trunc = message.substring(0, 500);
                        if (trunc.length != message.length) {
                            trunc = trunc.split(" ")
                            trunc.pop();
                            trunc = trunc.join(" ");
                        }
                        message = message.substring(trunc.length, message.length);
                        twitchBot.say('#ehnvi_', trunc)
                        .then(msg => {
                            console.log("Notif envoyée sur Twitch !");
                        })
                        .catch(err => {
                            console.log("Erreur lors de l'envoi du message twitch (ehnvi_) du don n°" + participation.id);
                            console.error(err);
                        });
                    }
                }
                else
                    twitchBot.say('#ehnvi_', `${participation.fullName} vient de participer à la cagnotte pour aider mon père ! Pour plus d'infos, écrivez !papa dans le chat ♥ elviMoney elviMoney elviMoney`)
                    .then(msg => {
                        console.log("Notif envoyée sur Twitch !");
                    })
                    .catch(err => {
                        console.log("Erreur lors de l'envoi du message twitch (ehnvi_) du don n°" + participation.id);
                        console.error(err);
                    });
            });
        });
    });

    // Connect to Twitch:
    twitchBot.connect();
}