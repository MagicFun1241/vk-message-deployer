#!/usr/bin/env node

const path = require('path');
const easyvk = require("easyvk");
const readline = require('readline-sync');
const validator = require('validator').default;

// TODO: Add more names
const MALE_NAMES = require('../config/maleNames.json');
const FEMALE_NAMES = require('../config/femaleNames.json');

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main(vk) {
    console.log();
    
    const message = readline.question('Enter message text: ', { encoding: 'utf8' });
    const sex = readline.keyInSelect([ 'All', 'Girls', 'Boys' ]);

    if (sex === -1) process.exit(0);

    var exclusions = [];

    if (readline.keyInYN('Do you want to add exceptions?')) {
        let tmp = readline.question('Enter identifiers separated by commas: ').trim().split(',');

        for (let i = 0; i < tmp.length; i++) {
            const exclusion = tmp[i];
            
            if (!validator.isInt(exclusion)) {
                vk.call('utils.resolveScreenName', {
                    screen_name: exclusion
                }).then(({ vkr }) => {
                    if (vkr.type === 'user') exclusions.push(parseInt(vkr.object_id));
                    else throw new Error('Cannot send message to group');
                });
            } else exclusions.push(parseInt(exclusion));
        }
    }

    console.log();
    console.log('Fetching a list of friends...');

    vk.call('friends.get', {
        fields: 'sex'
    }).then(({ vkr }) => {
        let list = [];
        let timeout = 2000;
        let requests = 0;

        console.log(`> ${vkr.count} users fetched`);
        console.log(`> and it will be delivered to ${vkr.count - exclusions.length} users.`);
        console.log();

        for (let i = 0; i < vkr.items.length; i++) {
            const friend = vkr.items[i];
            
            switch (sex) {
                case 0:
                    if (friend.deactivated === undefined && !exclusions.includes(friend.id)) list.push({
                        id: friend.id,
                        firstName: friend.first_name,
                        lastName: friend.last_name
                    });
                    break;
                case 1:
                    if (friend.sex === 1 && friend.deactivated === undefined && !MALE_NAMES.includes(friend.first_name.toLowerCase()) && !exclusions.includes(friend.id)) list.push({
                        id: friend.id,
                        firstName: friend.first_name,
                        lastName: friend.last_name
                    });
                    break;
                case 2:
                    if (friend.sex === 2 && friend.deactivated === undefined && !FEMALE_NAMES.includes(friend.first_name.toLowerCase()) && !exclusions.includes(friend.id)) list.push({
                        id: friend.id,
                        firstName: friend.first_name,
                        lastName: friend.last_name
                    });
                    break;
            }
        }

        for (let i = 0; i < list.length; i++) {
            const friend = list[i];

            timeout += 10000 + getRandomInt(1000, 5000);
            setTimeout(() => {
                vk.call('messages.send', {
                    random_id: 0,
                    user_id: friend.id,
                    message
                }).then(() => {
                    requests++;

                    if (requests === list.length) { // If it the last element
                        console.log(`Successfully sent ${requests} messages out of ${list.length}`);
                    }
                });
            }, timeout);
        }
    });
}

async function logInWith2Auth(params) {
    return new Promise(_2faNeed => {
	    function relogIn(_2faCode = "") {
            if (_2faCode) params.code = _2faCode;
      
	        easyvk(params).then(main).catch(err => {
		        if (!err.easyvk_error && err.error_code == 'need_validation') _2faNeed({ err, relogIn });
	        });
        }
        
	    relogIn();
    });
}

logInWith2Auth({
  username: readline.question('Enter username: '),
  password: readline.question('Enter password: ', { hideEchoBack: true }),
  session_file: path.join(__dirname, '.session')
}).then(({ relogIn }) => {
    let code = readline.question('Enter confirmation code: ');
    relogIn(code);
});