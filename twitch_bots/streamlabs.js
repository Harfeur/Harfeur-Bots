const axios = require('axios');

exports.run = () => {

    const leetchi = require('../modules/leetchi.js');

    leetchi.on("newParticipations", participations => {
        participations.forEach(participation => {
            var nom = participation.fullName.replace(/-/g, " ");
            if (participation.showContributionAmount) {
                var message = `${participation.fullName} vient de participer en donnant ${participation.amountFormatted} dans la cagnotte pour aider mon père ! Pour plus d'infos, écrivez !papa dans le chat ♥`;
                var money = participation.amountFormatted.split(" ");
                var moneyJoin = "";
                money.forEach(str => {
                    if (str != "€") moneyJoin += str;
                });
                var elvi = {
                    name: nom,
                    message: message,
                    identifier: nom.replace(" ", ""),
                    amount: parseFloat(moneyJoin),
                    currency: "EUR",
                    access_token: process.env.STREAMLABS_ACCESS_TOKEN
                }
                var ehnvi_ = {
                    name: nom,
                    message: message,
                    identifier: nom.replace(" ", ""),
                    amount: parseFloat(moneyJoin),
                    currency: "EUR",
                    access_token: process.env.STREAMLABS_ACCESS_TOKEN_EHNVI
                }
                
                axios.post('https://streamlabs.com/api/v1.0/donations', elvi)
                .then(msg => {
                    console.log("Notif envoyée sur Streamlabs !");
                })
                .catch(err => {
                    console.log("Erreur lors de l'envoi du message streamlabs elvi du don n°" + participation.id);
                    console.error(err);
                });
                axios.post('https://streamlabs.com/api/v1.0/donations', ehnvi_)
                .then(msg => {
                    console.log("Notif envoyée sur Streamlabs !");
                })
                .catch(err => {
                    console.log("Erreur lors de l'envoi du message streamlabs ehnvi_ du don n°" + participation.id);
                    console.error(err);
                });
            }
        });
    });

}