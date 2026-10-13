export const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    const user = socket.data.user;
    console.log(`Socket connected: ${socket.id} (User ID: ${user.id})`);

    //Each user is automatically added to their own personal room.
    const userRoom = `user_${user_id}`;
    socket.join(userRoom);
    console.log(`User ${user.id} joined personal room: ${userRoom}`);

    socket.on("join_area", (areaId, callback) => {
      const requestedAreaId = Number(areaId);

      if (user.role !== "BARBER") {
        return callback?.({
          success: false,
          error: "Only barbers can join area rooms",
        });
      }

      if (
        !Number.isInteger(requestedAreaId) ||
        requestedAreaId <= 0 ||
        user.area_id == null ||
        requestedAreaId !== Number(user.area_id)
      ) {
        return callback?.({
          success: false,
          error: "You cannot join this area",
        });
      }

      const room = `area_${requestedAreaId}`;
      socket.join(room);

      console.log(`Barber ${user.id} joined ${room}`);

      callback?.({
        success: true,
        area_id: requestedAreaId,
      });
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};