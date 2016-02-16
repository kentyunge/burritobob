/** user.js **/
var OrderModel = require('./Order.js');

var User = function (data) {  
    this.id = data.id || '';
    this.name = data.name || '';
    this.fullName = data.real_name || '';
    this.wantsFood = null;
    this.orderInProgress = false;
    this.order = new OrderModel();
};

User.prototype.id = '';
User.prototype.name = '';
User.prototype.fullName = '';
User.prototype.wantsFood = null;
User.prototype.orderInProgress = false;
User.prototype.order = {};

module.exports = User;