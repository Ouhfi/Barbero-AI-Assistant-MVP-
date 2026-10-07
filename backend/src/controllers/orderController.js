import E from "dotenv";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { where } from "sequelize";
import { me } from "./authController.js";

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
//======================getMyOrder===================

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
//==========================getMyOrderId=====================

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

    //====================getAvailableOrders================

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


    ///=================acceptOrder==================

export const acceptOrder = async (req , res) =>
{
    try {
        const {id} = req.params;

        const barber = await User.findByPk(req.user.id);

        if(!barber)
        {
            return res.status(404).json(
                {
                    message : " baraber is not founed",
                }
            );
        }

        if(barber.role  !== "BARBER")
        {
            return res.status(403).json(
                {
                    message : "Only barbers can accept orders"
                }
            )
        }

        const [updatedRows]  = await Order.update(
            
        
            {

            barber_id : barber.id,
            status : "ACCEPTED",
            },
            {
                 where : { 
                
                id, 
                area_id: barber.area_id, 
                status: "PENDING",
                barber_id: null,
                },
            });

            if(updatedRows === 0)
            {
                return res.status(400).json(
                    {
                        message : "Order not found or already accepted by another barber"
                    }
                );

              
            } 
             return res.status(200).json(
                    {
                        message : "order accpted successfuly"
                    }
                )
    }
    catch(error)
    {
        console.error(error);

        return res.status(500).json(
            {
                message : " failed  to accept order ",
                error : error.message,
            });
    }
}

//===================completeOrder===============
export const completeOrder = async (req , res )=>
{
    try{
        const {id} = req.params;

        const barber = await User.findByPk(req.user.id);

        if(!barber)
            {
                return res.status(404).json(
                    {
                        message : " barber is not found"
                    }
                );
            }

            if(barber.role !== "BARBER")
            {
                return res.status(403).json(
                    {
                        message : "Only barbers can complete orders"
                    }
                );
            }
            
            const [updatedRows] = await Order.update(
                {
                    status  : "COMPLETED"
                },
                {
                    where : 
                    {
                        id , 
                        barber_id : barber.id,
                        status: "ACCEPTED"
                    }
                }
            );

            if(updatedRows === 0)
            {
                return res.status(409).json(
                    {
                        message : "Order cannot be completed",
                    }
                );
            }

            const order = await Order.findByPk(id);

            return res.status(200).json(
                {
                    message : "Order completed successfully",
                    order
                }
            )
    }
    catch(error)
    {
        console.error(error);
        return res.status(500).json(
            {
                message  : "Failed to complete order",
                error : error.message,
            }
        );
        
    }
}