'use strict';

const Slackbots = require('slackbots');
const UserModel = require('./lib/User.js');
const Utils = require('./lib/Utilities');
const express = require('express');


/* Variables */
var orderInProgress = false;
var orderStartedBy = null;
var orders = [];
var options = ['vegetarian', 'ham', 'bacon', 'sausage', 'chorizo'];
var users = [];
var user = null;

/* Configure Express */

const app = express();

app.get('/', (req, res) => res.send('Keep me running!'));

app.listen(process.env.PORT || 3000, () => console.log('App is running'));

const bot = new Slackbots({
    token: process.env.BOT_API_KEY,
    name: process.env.BOT_NAME || 'burritobob'
});

bot.on('start', function() {
    console.log('started');
    bot.getUsers().then(_users => {
        users = _users.members;
        console.log('users loaded');
    });
    _loadBotUser();
});

bot.on('message', function(message) {
    const messageUser = _getUserById(message.user);
    if (messageUser) {
        console.log('messageUser', messageUser.name);
    }

    if (Utils.isChatMessage(message) && Utils.isDirectMessage(message) && !Utils.isFromBurritoBobBot(message)) {
        if (orderInProgress) {
            var _userOrder = _findUserOrder(message.user);
            
            switch (_userOrder.order.step) {
            case 1:
                _processStep1(message);
                break;
            case 2:
                _processStep2(message);
                break;
            case 3:
                _processStep3(message);
                break;
            case 4:
                _processStep4(message);
                break;
            case 5:
                _processStep5(message);
                break;
            default:
                bot.postMessageToUser(messageUser.name, 'An order is already in progress, please be patient.');
            }
        } else {
            if (Utils.isMentioningBurritos(message)) {
                _startOrder(messageUser);
            }
        }
    }
});

/**
 * Starts the ordering process
 * @param {object} originalMessage
 * @private
 */
const _startOrder = function (messageUser) {
    bot.postMessageToUser(messageUser.name, "I will ask everyone what they want and get back to you in a minute.").then(function () {
        // get a list of users so the bot can start the order process with each of them
        var _users = [];
        users.forEach(_user => {
            _users.push(new UserModel(_user));
        });

        // set globals
        orderInProgress = true;
        orderStartedBy = messageUser;
        orders = _users;

        _startStep1(); // kick off the order process

        setTimeout(function () {  // send orders after 10 minutes
            _getOrders(messageUser.name);
        }, 60000 * 10);
    });
};


/**
 * Retrieves all of the orders and sends them to the user who started the process
 * @param {object} user
 * @private
 */
const _getOrders = function (_user) {
    var completedOrders = [];
    var inProgressOrders = [];
    
    orders.forEach(_user => {
        if (_user.wantsFood && !_user.orderInProgress) {
            completedOrders.push(_user.fullName + " wants a " + _user.order.meat + ' ' + _user.order.type + ' with ' + _user.order.salsa + ' salsa\nSpecial Instructions: ' + _user.order.specialInstructions);
        }        
    });

    orders.forEach(_user => {
        if (_user.wantsFood && _user.orderInProgress) {
            inProgressOrders.push(_user.fullName);
        }
    });
        
    bot.postMessageToUser(_user, completedOrders.join('\n') + "\n\nPeople who started orders but didn't complete the order:\n" + inProgressOrders.join('\n'));
    _reset();
};

/**
 * Start step 1 - send message to each user asking them if they want to order
 * @private
 */
const _startStep1 = function () {
    users.forEach(_user => {
        if (_user.name !== 'slackbot') { //|| _user.name === 'joeseckelman') TODO: Remove Kent check
            bot.postMessageToUser(_user.name, "WHOA! " + orderStartedBy.real_name + " wants to go get Jalapenos for breakfast.  Would you like to place an order?");
        }        
    })
};

/**
 * Process step 1 and kick off step 2
 * @param {object} originalMessage
 * @private
 */
const _processStep1 = function(_message) {
    var _userOrder = _findUserOrder(_message.user);
    
    if (_userOrder.wantsFood === null) {
        if (_message.text.toLowerCase().indexOf('yes') > -1) {
            _userOrder.orderInProgress = true;
            _userOrder.wantsFood = true;
            _userOrder.order.step++;
            _startStep2(_message.user);
        } else if (_message.text.toLowerCase().indexOf('no') > -1) {
            _userOrder.wantsFood = false;
        } else {
            // User didn't answer yes or no - send message to retry.
            var messageUser = _getUserById(_message.user);
            bot.postMessageToUser(messageUser.name, "I don't think you understood.  That was a 'yes' or 'no' question...please try again.");
        }
    }
};

/**
 * Start step 2 - ask what they want
 * @param {object} user
 * @private
 */
const _startStep2 = function(_user) {
    var messageUser = _getUserById(_user);
    bot.postMessageToUser(messageUser.name, "Great!  Would you like a burrito or a taco?"); 
};

/**
 * Process step 2 and kick off step 3
 * @param {object} originalMessage
 * @private
 */
const _processStep2 = function(_message) {
    var _userOrder = _findUserOrder(_message.user);
    
    if (_message.text.toLowerCase().indexOf('taco') > -1) {
        _userOrder.order.type = 'taco';
        _userOrder.order.step++;
        _startStep3(_message.user);
    } else if (_message.text.toLowerCase().indexOf('burrito') > -1) {
        _userOrder.order.type = 'burrito';
        _userOrder.order.step++;
        _startStep3(_message.user);
    } else {
        var messageUser = _getUserById(_message.user);
        bot.postMessageToUser(messageUser.name, "I have no idea what you're asking for - do you want a burrito or taco?");
    }
};

/**
 * Start step 3 - Ask what they want in burrito/taco
 * @param {object} user
 * @private
 */
const _startStep3 = function(_user) {
    var messageUser = _getUserById(_user);
    
    var optionsString = options.join("\n");
    
    bot.postMessageToUser(messageUser.name, "Good choice.  What would you like in it?  Your options are: \n" + optionsString);
};

/**
 * Process step 3 and proceed to step 4
 * @param {object} originalMessage
 * @private
 */
const _processStep3 = function(_message) {
    var _userOrder = _findUserOrder(_message.user);
    
    var found = options.find(option => {
        return _message.text.toLowerCase().indexOf(option) > -1;
    });
    
    if (found) {
        _userOrder.order.meat = found;
        _userOrder.order.step++;
        _startStep4(_message.user);
    } else {
        var messageUser = _getUserById(_message.user);
        bot.postMessageToUser(messageUser.name, "This isn't they type of place where you can order off menu.  Let's stick to the list provided.....can you try that again?");
    }
};

/**
 * Start step 4 - ask about salsa
 * @param {object} user
 * @private
 */
const _startStep4 = function(_user) {
    var messageUser = _getUserById(_user);
    bot.postMessageToUser(messageUser.name, "Got it - let's talk salsa, would you like hot or mild?");
};

/**
 * Process step 4 and move to step 5
 * @param {object} originalMessage
 * @private
 */
const _processStep4 = function(_message) {
    var _userOrder = _findUserOrder(_message.user);
    
    if (_message.text.toLowerCase().indexOf('hot') > -1) {
        _userOrder.order.salsa = 'hot';
        _userOrder.order.step++;
        _startStep5(_message.user);
    } else if (_message.text.toLowerCase().indexOf('mild') > -1) {
        _userOrder.order.salsa = 'mild';
        _userOrder.order.step++;
        _startStep5(_message.user);
    } else {
        var messageUser = _getUserById(_message.user);
        bot.postMessageToUser(messageUser.name, "I don't think they have that kind of salsa, how about hot or mild?");
    }
};

/**
 * start step 5 - ask about special instructions
 * @param {object} user
 * @private
 */
const _startStep5 = function(_user) {
    var messageUser = _getUserById(_user);
    bot.postMessageToUser(messageUser.name, "Ok, one last thing - are there any special instructions I should know about?");
};

/**
 * process step 5
 * @param {object} originalMessage
 * @private
 */
const _processStep5 = function(_message) {
    var _userOrder = _findUserOrder(_message.user);
    _userOrder.order.specialInstructions = _message.text;
    _userOrder.orderInProgress = false;
    
    var messageUser = _getUserById(_message.user);
    bot.postMessageToUser(messageUser.name, "Thanks - I'll let " + orderStartedBy.real_name + " know about your order.");
};


/**
 * Lookup Functions
 */
const _getUserById = function (user) {
    var found = users.filter(function (_user) {
        return _user.id === user;
    })[0];

    return found;
};

const _findUserOrder = function(_user) {
    var found =  orders.find(_order => {
        return _order.id === _user;
    });
    
    return found;
};

const _reset = function () {
    orderInProgress = false;
    orderStartedBy = null;
    orders = [];
};

const _loadBotUser = function () {
    user = users.filter(function (user) {
        return user.name === name;
    })[0];
};