import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// keep your existing routes here
// app.use("/login", loginRoutes);
// app.use("/users", userRoutes);

export default app;