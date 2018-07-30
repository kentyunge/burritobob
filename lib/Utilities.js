const utilities = {};

utilities.isChatMessage = function(message) {
    return message.type === 'message' && Boolean(message.text);
}

utilities.isDirectMessage = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'D';
};

utilities.isFromBurritoBobBot = function (message, BB_ID) {
    return ((message.user && message.user === BB_ID) || (message.username && message.username === 'burritobob'));
};

utilities.isMentioningBurritos = function (message) {
    return message.text.toLowerCase().indexOf('start order') > -1;
};


module.exports = utilities;