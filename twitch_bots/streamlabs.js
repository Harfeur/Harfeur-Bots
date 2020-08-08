const axios = require('axios');

exports.run = () => {

    const leetchi = require('../modules/leetchi.js');

    leetchi.on("newParticipations", participations => {
        participations.forEach(participation => {
            console.log(participation);
            var nom = participation.fullName.replace(/-/g, " ");
            if (participation.showContributionAmount) {
                var message = `${participation.fullName} vient de participer en donnant ${participation.amountFormatted} dans la cagnotte pour aider mon père ! Pour plus d'infos, écrivez !papa dans le chat ♥`;
                var money = participation.amountFormatted.split(" ");
                var moneyJoin = "";
                money.forEach(str => {
                    if (str != "€") moneyJoin += str;
                });
                var data = {
                    name: nom,
                    message: message,
                    identifier: nom.replace(" ", ""),
                    amount: parseFloat(moneyJoin),
                    currency: "EUR",
                    access_token: process.env.STREAMLABS_ACCESS_TOKEN
                }
                console.log("Lancement")
                axios.post('https://streamlabs.com/api/v1.0/donations', data)
                    .then((res) => {
                        console.log(`Status: ${res.status}`);
                        console.log('Body: ', res.data);
                    })
                    .catch((err) => {
                        console.error(err);
                    });
            }
        });
    });

}