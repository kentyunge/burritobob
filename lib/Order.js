/** user.js **/

var Order = function (type, meat, salsa, specialInstructions, step) {
    this.type = type || ''; // burrito or taco
    this.meat = meat || ''; // vegetarian, ham, bacon, sausage, or chorizo
    this.salsa = salsa || ''; // hot or mild
    this.specialInstructions = specialInstructions || '';
    this.step = step || 1;
};

Order.prototype.type = '';
Order.prototype.meat = '';
Order.prototype.salsa = '';
Order.prototype.specialInstructions = '';
Order.prototype.step = 1;

module.exports = Order;