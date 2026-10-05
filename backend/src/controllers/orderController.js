import E from "dotenv";
import Order from "../models/Order.js";
import User from "../models/User.js";

export const  createOrder = async (req , res ) =>
{
    try
    {
         const {area_id , service_details } = req.body || {};

         if(!area_id || !service_details)
         {
            return res.status(400).json(
                {
                    message : "area_id and service_details are required"
                }
            )
         }

         const order =  await Order.create(
            {
                customer_id : req.user.id,
                area_id,
                service_details,
                
            }
         );

         return res.status(201).json({
            Message: "Order created successfully",
            order,
         })
    }
    
    catch(error)
    {
        console.error(error);

        return res.status(500).json({

            message : "Failed to create order"
        });
    }
}

export const getMyOrder = async (req , res ) =>
{
    try {
        const orders = await Order.findAll(
            {
                where :
                {
                     customer_id : req.user.id,
                },
                order : [["createdAt" , "DESC"]],
            });

            return res.status(200).json({
                message : " Orders retrieved successfully",
                orders ,
            });
    }
    catch(error)
    {
        console.error(error);
        return res.status(500).json(
            {
                message : "failed to fetch order ",
                error : error.Message
            }
        )
    }
  
} 

export const getMyOrderId = async (req , res) => 
    {
        try{
            const {id} = req.params;

            const orders = await Order.findAll({
                where :
                {
                    id, 
                     customer_id : req.user.id,
                },
                order : [["createdAt" , "DESC"]],
            });

            if(!orders)
            {
                return res.status(404).json({
                    message : " order is not found "
                });
            }

            return res.status(200).json({
                orders
            })

        }
        catch(error)
        {
            console.error(error);
            return res.status(500).json({
                message : " failed to fetch order",
                error : error.message
            });
        }
    } 

    export  const getAvailableOrders =  async (req , res ) => {
        try{
            const barber = await User.findByPk(req.user.id);

            if(!barber)
            {
                return res.status(404).json({
                    message : "barber is  not found "
                });
            }

            if(barber.role !== "BARBER")
            {
                return res.status(403).json(
                    {
                        message : "Only barbers can access available orders"
                    }
                );
            }

            const orders = await Order.findAll({
                where : {
                    area_id : barber.area_id,
                    status : "PENDING",
                    barber_id : null,
                },
                order: [["createdAt", "DESC"]],
            });

            return res.status(200).json(
                {
                    orders,

                }
            );
            
        }
        catch (error)
        {
            console.error(error);
            return res.status(500).json(
                {
                    message : " Failed to fetch available orders"
                }
            )
        }
    }