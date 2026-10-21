import { apiClient } from "./api";

export type OrderStatus = "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELED";

export interface Order {
  id: number;
  customer_id: number;
  barber_id: number | null;
  area_id: number;
  service_details: string;
  status: OrderStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrdersResponse {
  message?: string;
  orders: Order[];
}

export interface CreateOrderPayload {
  area_id: number;
  service_details: string;
}

export interface CreateOrderResponse {
  message: string;
  order: Order;
}

export interface OrderActionResponse {
  message: string;
  order: Order;
}

export interface SingleOrderResponse {
  order: Order;
}

/**
 * Fetches the authenticated customer's booking history.
 * Endpoint: GET /api/orders
 * Returns orders where customer_id = req.user.id
 */
export async function getCustomerOrders(): Promise<Order[]> {
  const response = await apiClient.get<OrdersResponse>("/orders");
  return response.data.orders || [];
}

/**
 * Fetches pending orders available to barbers in their assigned area.
 * Endpoint: GET /api/orders/available
 * Requires: Role BARBER with an assigned area_id
 */
export async function getAvailableBarberOrders(): Promise<Order[]> {
  const response = await apiClient.get<OrdersResponse>("/orders/available");
  return response.data.orders || [];
}

/**
 * Fetches accepted orders assigned to the authenticated barber.
 * Endpoint: GET /api/orders/assigned
 * Requires: Role BARBER
 */
export async function getAssignedBarberOrders(): Promise<Order[]> {
  const response = await apiClient.get<OrdersResponse>("/orders/assigned");
  return response.data.orders || [];
}

/**
 * Creates a new booking request on behalf of the authenticated customer.
 * Endpoint: POST /api/orders
 * Status code: 201 Created
 */
export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  const response = await apiClient.post<CreateOrderResponse>("/orders", {
    area_id: payload.area_id,
    service_details: payload.service_details.trim(),
  });
  return response.data;
}

/**
 * Fetches a single order by ID for the authenticated customer.
 * Endpoint: GET /api/orders/:id
 */
export async function getOrderById(id: number): Promise<Order> {
  const response = await apiClient.get<SingleOrderResponse>(`/orders/${id}`);
  return response.data.order;
}

/**
 * Allows a barber to accept a pending order within their assigned area.
 * Endpoint: PATCH /api/orders/:id/accept
 * Requires: Role BARBER with matching area_id
 */
export async function acceptOrder(id: number): Promise<OrderActionResponse> {
  const response = await apiClient.patch<OrderActionResponse>(`/orders/${id}/accept`);
  return response.data;
}

/**
 * Allows an assigned barber to mark an accepted order as completed.
 * Endpoint: PATCH /api/orders/:id/complete
 * Requires: Role BARBER with matching barber_id
 */
export async function completeOrder(id: number): Promise<OrderActionResponse> {
  const response = await apiClient.patch<OrderActionResponse>(`/orders/${id}/complete`);
  return response.data;
}

/**
 * Cancels an order:
 * - By Customer: allowed only if status is PENDING
 * - By Barber: allowed only if status is ACCEPTED
 * Endpoint: PATCH /api/orders/:id/cancel
 */
export async function cancelOrder(id: number): Promise<OrderActionResponse> {
  const response = await apiClient.patch<OrderActionResponse>(`/orders/${id}/cancel`);
  return response.data;
}
