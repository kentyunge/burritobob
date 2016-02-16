'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var Bot = require('slackbots');
var _ = require('lodash');
var UserModel = require('./User.js');


/* Variables */
var orderInProgress = false;
var orderStartedBy = null;
var orders = [];
var options = ['vegetarian', 'ham', 'bacon', 'sausage', 'chorizo'];


/**
 * Constructor function. It accepts a settings object which should contain the following keys:
 *      token : the API token of the bot (mandatory)
 *      name : the name of the bot (will default to "burritobob")
 *
 * @param {object} settings
 * @constructor
 *
 * Started with Luciano Mammino's Chuck Norris bot - https://scotch.io/tutorials/building-a-slack-bot-with-node-js-and-chuck-norris-super-powers
 */
var BurritoBobBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'burritobob';

    this.user = null;
};

// inherits methods and properties from the Bot constructor
util.inherits(BurritoBobBot, Bot);

/**
 * Run the bot
 * @public
 */
BurritoBobBot.prototype.run = function () {
    BurritoBobBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

/**
 * On Start callback, called when the bot connects to the Slack server and access the channel
 * @private
 */
BurritoBobBot.prototype._onStart = function () {
    this._loadBotUser();
};

/**
 * On message callback, called when a message (of any type) is detected with the real time messaging API
 * @param {object} message
 * @private
 */
BurritoBobBot.prototype._onMessage = function (message) {
    var messageUser = this._getUserById(message.user);

    if (this._isChatMessage(message) &&
        this._isDirectMessage(message) &&
        !this._isFromBurritoBobBot(message)) {

        if (orderInProgress) {
            var _userOrder = this._findUserOrder(message.user);
            
            switch (_userOrder.order.step) {
            case 1:
                this._processStep1(message);
                break;
            case 2:
                this._processStep2(message);
                break;
            case 3:
                this._processStep3(message);
                break;
            case 4:
                this._processStep4(message);
                break;
            case 5:
                this._processStep5(message);
                break;
            default:
                this.postMessageToUser(messageUser.name, 'An order is already in progress, please be patient.');
            }
        } else {
            if (this._isMentioningBurritos(message)) {
                this._startOrder(messageUser);
            }
        }
    }
};

/**
 * Starts the ordering process
 * @param {object} originalMessage
 * @private
 */
BurritoBobBot.prototype._startOrder = function (messageUser) {
    var self = this;

    self.postMessageToUser(messageUser.name, "I will ask everyone what they want and get back to you in a minute.").then(function () {
        // get a list of users so the bot can start the order process with each of them
        var _users = [];
        _.each(self.users, function (_user) {
            _users.push(new UserModel(_user));
        });

        // set globals
        orderInProgress = true;
        orderStartedBy = messageUser;
        orders = _users;

        self._startStep1(); // kick off the order process

        setTimeout(function () {  // send orders after 10 minutes
            self._getOrders(messageUser.name);
        }, 60000 * 10);
    });
};

/**
 * Retrieves all of the orders and sends them to the user who started the process
 * @param {object} user
 * @private
 */
BurritoBobBot.prototype._getOrders = function (_user) {
    var self = this;
    var completedOrders = [];
    var inProgressOrders = [];
    
    _.each(orders, function(_user) {
        if (_user.wantsFood && !_user.orderInProgress) {
            completedOrders.push(_user.fullName + " wants a " + _user.order.meat + ' ' + _user.order.type + ' with ' + _user.order.salsa + ' salsa\nSpecial Instructions: ' + _user.order.specialInstructions);
        }
    });
    
    _.each(orders, function(_user) {
        if (_user.wantsFood && _user.orderInProgress) {
            inProgressOrders.push(_user.fullName);
        }
    });
    
    self.postMessageToUser(_user, completedOrders.join('\n') + "\n\nPeople who started orders but didn't complete the order:\n" + inProgressOrders.join('\n'));
    this._reset();
};

/**
 * Start step 1 - send message to each user asking them if they want to order
 * @private
 */
BurritoBobBot.prototype._startStep1 = function () {
    var self = this;
    _.each(self.users, function (_user) {
        if (_user.name !== 'slackbot') { //|| _user.name === 'joeseckelman') TODO: Remove Kent check
            self.postMessageToUser(_user.name, "WHOA! " + orderStartedBy.real_name + " wants to go get Jalapenos for breakfast.  Would you like to place an order?");
        }
    });
};

/**
 * Process step 1 and kick off step 2
 * @param {object} originalMessage
 * @private
 */
BurritoBobBot.prototype._processStep1 = function(_message) {
    var _userOrder = this._findUserOrder(_message.user);
    
    if (_userOrder.wantsFood === null) {
        if (_message.text.toLowerCase().indexOf('yes') > -1) {
            _userOrder.orderInProgress = true;
            _userOrder.wantsFood = true;
            _userOrder.order.step++;
            this._startStep2(_message.user);
        } else if (_message.text.toLowerCase().indexOf('no') > -1) {
            _userOrder.wantsFood = false;
        } else {
            // User didn't answer yes or no - send message to retry.
            var messageUser = this._getUserById(_message.user);
            this.postMessageToUser(messageUser.name, "I don't think you understood.  That was a 'yes' or 'no' question...please try again.");
        }
    }
};

/**
 * Start step 2 - ask what they want
 * @param {object} user
 * @private
 */
BurritoBobBot.prototype._startStep2 = function(_user) {
    var messageUser = this._getUserById(_user);
    this.postMessageToUser(messageUser.name, "Great!  Would you like a burrito or a taco?"); 
};

/**
 * Process step 2 and kick off step 3
 * @param {object} originalMessage
 * @private
 */
BurritoBobBot.prototype._processStep2 = function(_message) {
    var _userOrder = this._findUserOrder(_message.user);
    
    if (_message.text.toLowerCase().indexOf('taco') > -1) {
        _userOrder.order.type = 'taco';
        _userOrder.order.step++;
        this._startStep3(_message.user);
    } else if (_message.text.toLowerCase().indexOf('burrito') > -1) {
        _userOrder.order.type = 'burrito';
        _userOrder.order.step++;
        this._startStep3(_message.user);
    } else {
        var messageUser = this._getUserById(_message.user);
        this.postMessageToUser(messageUser.name, "I have no idea what you're asking for - do you want a burrito or taco?");
    }
};

/**
 * Start step 3 - Ask what they want in burrito/taco
 * @param {object} user
 * @private
 */
BurritoBobBot.prototype._startStep3 = function(_user) {
    var messageUser = this._getUserById(_user);
    
    var optionsString = options.join("\n");
    
    this.postMessageToUser(messageUser.name, "Good choice.  What would you like in it?  Your options are: \n" + optionsString);
};

/**
 * Process step 3 and proceed to step 4
 * @param {object} originalMessage
 * @private
 */
BurritoBobBot.prototype._processStep3 = function(_message) {
    var _userOrder = this._findUserOrder(_message.user);
    
    var found = _.find(options, function(option) {
        return _message.text.toLowerCase().indexOf(option) > -1;
    });
    
    if (found) {
        _userOrder.order.meat = found;
        _userOrder.order.step++;
        this._startStep4(_message.user);
    } else {
        var messageUser = this._getUserById(_message.user);
        this.postMessageToUser(messageUser.name, "This isn't they type of place where you can order off menu.  Let's stick to the list provided.....can you try that again?");
    }
};

/**
 * Start step 4 - ask about salsa
 * @param {object} user
 * @private
 */
BurritoBobBot.prototype._startStep4 = function(_user) {
    var messageUser = this._getUserById(_user);
    this.postMessageToUser(messageUser.name, "Got it - let's talk salsa, would you like hot or mild?");
};

/**
 * Process step 4 and move to step 5
 * @param {object} originalMessage
 * @private
 */
BurritoBobBot.prototype._processStep4 = function(_message) {
    var _userOrder = this._findUserOrder(_message.user);
    
    if (_message.text.toLowerCase().indexOf('hot') > -1) {
        _userOrder.order.salsa = 'hot';
        _userOrder.order.step++;
        this._startStep5(_message.user);
    } else if (_message.text.toLowerCase().indexOf('mild') > -1) {
        _userOrder.order.salsa = 'mild';
        _userOrder.order.step++;
        this._startStep5(_message.user);
    } else {
        var messageUser = this._getUserById(_message.user);
        this.postMessageToUser(messageUser.name, "I don't think they have that kind of salsa, how about hot or mild?");
    }
};

/**
 * start step 5 - ask about special instructions
 * @param {object} user
 * @private
 */
BurritoBobBot.prototype._startStep5 = function(_user) {
    var messageUser = this._getUserById(_user);
    this.postMessageToUser(messageUser.name, "Ok, one last thing - are there any special instructions I should know about?");
};

/**
 * process step 5
 * @param {object} originalMessage
 * @private
 */
BurritoBobBot.prototype._processStep5 = function(_message) {
    var _userOrder = this._findUserOrder(_message.user);
    _userOrder.order.specialInstructions = _message.text;
    _userOrder.orderInProgress = false;
    
    var messageUser = this._getUserById(_message.user);
    this.postMessageToUser(messageUser.name, "Thanks - I'll let " + orderStartedBy.real_name + " know about your order.");
};

/**
 * Reset globals
 * @private
 */
BurritoBobBot.prototype._reset = function () {
    orderInProgress = false;
    orderStartedBy = null;
    orders = [];
};

/**
 * Retrieve the order in progress
 * @param {object} user
 * @returns {object} userOrder
 * @private
 */
BurritoBobBot.prototype._findUserOrder = function(_user) {
    var found =  _.find(orders, function(_order) {
        return _order.id === _user;
    });
    
    return found;
};

/**
 * Loads the user object representing the bot
 * @private
 */
BurritoBobBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

/**
 * Util function to check if a given real time message object represents a chat message
 * @param {object} message
 * @returns {boolean}
 * @private
 */
BurritoBobBot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

/**
 * Util function to check if a given real time message object is in direct message
 * @param {object} message
 * @returns {boolean}
 * @private
 */
BurritoBobBot.prototype._isDirectMessage = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'D';
};

/**
 * Util function to check if a given real time message is mentioning start order
 * @param {object} message
 * @returns {boolean}
 * @private
 */
BurritoBobBot.prototype._isMentioningBurritos = function (message) {
    return message.text.toLowerCase().indexOf('start order') > -1;
};


/**
 * Util function to check if a given real time message has ben sent by burritobob
 * @param {object} message
 * @returns {boolean}
 * @private
 */
BurritoBobBot.prototype._isFromBurritoBobBot = function (message) {
    return ((message.user && message.user === this.user.id) || (message.username && message.username === 'burritobob'));
};

/**
 * Util function to get the name of a channel given its id
 * @param {string} channelId
 * @returns {Object}
 * @private
 */
BurritoBobBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

/**
 * Util function to return a user object based on id
 * @param {string} user
 * @returns {Object}
 * @private
 */
BurritoBobBot.prototype._getUserById = function (user) {
    var found = this.users.filter(function (_user) {
        return _user.id === user;
    })[0];

    return found;
};

module.exports = BurritoBobBot;