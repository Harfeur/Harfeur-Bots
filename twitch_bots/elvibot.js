const tmi = require('tmi.js');
const dialogflow = require('@google-cloud/dialogflow');

const projectId = 'small-talk-jssokx';
const languageCode = 'fr';

exports.run = () => {

    const leetchi = require('../modules/leetchi.js');

    process.env['GOOGLE_APPLICATION_CREDENTIALS'] = __dirname + "/Small-Talk-1071da34a79a.json";

    function hashCode(s) {
        var h = 0,
            l = s.length,
            i = 0;
        if (l > 0)
            while (i < l)
                h = (h << 5) - h + s.charCodeAt(i++) | 0;
        return h;
    };

    const sessionClient = new dialogflow.SessionsClient();

    async function detectIntent(
        projectId,
        sessionId,
        query,
        contexts,
        languageCode
    ) {
        // The path to identify the agent that owns the created intent.
        const sessionPath = sessionClient.projectAgentSessionPath(
            projectId,
            sessionId
        );

        // The text query request.
        const request = {
            session: sessionPath,
            queryInput: {
                text: {
                    text: query,
                    languageCode: languageCode,
                },
            },
        };

        if (contexts && contexts.length > 0) {
            request.queryParams = {
                contexts: contexts,
            };
        }

        const responses = await sessionClient.detectIntent(request);
        return responses[0];
    }

    async function executeQueries(projectId, username, queries, languageCode) {
        // Keeping the context across queries let's us simulate an ongoing conversation with the bot
        let sessionId = hashCode(username);
        let context;
        let intentResponse;
        for (const query of queries) {
            try {
                intentResponse = await detectIntent(
                    projectId,
                    sessionId,
                    query,
                    context,
                    languageCode
                );
                if (intentResponse.queryResult.fulfillmentText != "") {
                    twitchBot.say('#mrelvilia', username + ", " + intentResponse.queryResult.fulfillmentText);
                }
                // Use the context from this response for next queries
                context = intentResponse.queryResult.outputContexts;
            } catch (error) {
                console.log(error);
            }
        }
    }

    const opts = {
        connection: {
            reconnect: true
        },
        identity: {
            username: process.env.BOT_USERNAME,
            password: process.env.OAUTH_TOKEN
        },
        channels: [
            process.env.CHANNEL_NAME
        ]
    };

    const twitchBot = new tmi.client(opts);

    var nbBo = 0;
    var lastBo = new Date();
    var maxBo = 5;

    // Register our event handlers (defined below)

    twitchBot.on('message', (target, context, msg, self) => {
        if (self) return;

        // Remove whitespace from chat message
        const commandName = msg.trim().toLowerCase();
        /*
        console.log(target);
        console.log(context);
        console.log(msg);
        console.log('');
        */
        if (msg.toLowerCase().includes('elvibot')) {
            var query = msg.toLowerCase().split("elvibot").join('');
            executeQueries(projectId, context.username, [query], languageCode);
        }

        // If the command is known, let's execute it
        if (commandName === '!bo') {
            var now = Date.now();
            if (nbBo != 0 && now - lastBo < 20000) {
                ++nbBo;
                lastBo = now;
                if (nbBo == maxBo) {
                    twitchBot.say(target, "/marker");
                    twitchBot.say(target, "/me Un best of a été enregistré");
                }
            } else {
                nbBo = 1;
                lastBo = now;
                twitchBot.say(target, `Est-ce-que ce moment doit resté gravé à tout jamais ? Si tu penses que oui, utilises !bo (${maxBo} commandes sont nécessaires)`);
            }
        }

    });



    twitchBot.on("subscription", (channel, username, method, message, userstate) => {
        console.log("Subscription");
        console.log(method);
        console.log(userstate);

        twitchBot.say(channel, `Merci beaucoup ${username} pour le sub !! Et bienvenue à toi !! elviSub elviSub elviSub`);
    });

    twitchBot.on("resub", (channel, username, months, message, userstate, methods) => {
        console.log("Resub");
        console.log(userstate);
        console.log(methods);

        let msg = "";
        if (months >= 1) twitchBot.say(channel, `Merci beaucoup ${username} d'avoir resub !! ${months} mois à la suite !! Tu gères elviSub elviSub elviSub`);
        else twitchBot.say(channel, `Merci beaucoup ${username} pour le resub !! elviSub elviSub elviSub`);
    });

    twitchBot.on("subgift", (channel, username, streakMonths, recipient, methods, userstate) => {
        console.log("Gift");
        console.log(userstate);
        console.log(methods);
        twitchBot.say(channel, `Merci beaucoup ${username} d'avoir offert un sub à ${recipient} !! elviSub elviSub elviSub`);
    });

    twitchBot.on("timeout", (channel, username, reason, duration, userstate) => {
        console.log("TO");
        console.log(userstate);
        if (duration != 0)
            twitchBot.say(channel, `Bye bye ${username} elviHey Tu pourras reparler dans ${duration} secondes.`)
    });

    twitchBot.on("raided", (channel, username, viewers) => {
        console.log("RAID");
        twitchBot.say(channel, `${viewers} futurs subs potentiels viennent d'arriver via ${username} ! elviHey elviHey`)
    });

    twitchBot.on("ban", (channel, username, reason, userstate) => {
        console.log("BAN");
        console.log(userstate);
        twitchBot.say(channel, `${username}, la tribu réunifiée a décidé de vous éliminer, et leur sentence est irrévocable.`);
    });

    twitchBot.on("submysterygift", (channel, username, numbOfSubs, methods, userstate) => {
        console.log("Gift++");
        console.log(userstate);
        console.log(methods);
        twitchBot.say(channel, `OMG ${username} offre ${numbOfSubs} subs à la commu ! Débisous et merci à lui !! elviSub elviSub elviSub`);
    });

    function bonneAnnee() {
        var minuit = new Date()
        minuit.setHours(0);
        minuit.setMinutes(0);
        minuit.setSeconds(0);
        minuit.setMilliseconds(0)
        minuit = new Date(minuit.getTime() + 79200000);
        console.log(minuit - Date.now());
        if (minuit - Date.now() > 1000) {
            setTimeout(() => {
                console.log("Bonne année");
                twitchBot.say('#mrelvilia', 'elviKappa Bonne année ! elviKappa');
                setTimeout(bonneAnnee(), 1000);
            }, minuit - Date.now());
        } else {
            console.log("ERREUR BONNE ANNEE");
        }
    }

    twitchBot.on('connected', (addr, port) => {
        console.log(`* Connected to ${addr}:${port}`);
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
                        twitchBot.say('#mrelvilia', trunc)
                        .then(msg => {
                            console.log("Notif envoyée sur Twitch !");
                        })
                        .catch(err => {
                            console.log("Erreur lors de l'envoi du message twitch du don n°" + participation.id);
                            console.error(err);
                        });
                    }
                }
                else
                    twitchBot.say('#mrelvilia', `${participation.fullName} vient de participer à la cagnotte pour aider mon père ! Pour plus d'infos, écrivez !papa dans le chat ♥`)
                    .then(msg => {
                        console.log("Notif envoyée sur Twitch !");
                    })
                    .catch(err => {
                        console.log("Erreur lors de l'envoi du message twitch du don n°" + participation.id);
                        console.error(err);
                    });
            });
        });
    });

    // Connect to Twitch:
    twitchBot.connect();
}