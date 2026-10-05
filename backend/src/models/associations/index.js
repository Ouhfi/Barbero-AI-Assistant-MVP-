import User from "../User.js";
import Area from "../Area.js";
import Order from "../Order.js";

User.hasMany(Order, {
    foreignKey: "customer_id",
    as: "customerOrders",
});

Order.belongsTo(User, {
    foreignKey: "customer_id",
    as: "customer",
});

User.hasMany(Order, {
    foreignKey: "barber_id",
    as: "barberOrders",
});

Order.belongsTo(User, {
    foreignKey: "barber_id",
    as: "barber",
});

Area.hasMany(Order, {
    foreignKey: "area_id",
    as: "orders",
});

Order.belongsTo(Area, {
    foreignKey: "area_id",
    as: "area",
});