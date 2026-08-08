import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);

app.listen(port, () => {
  console.log(`Server is running!`);
  console.log(`- View DB logs: http://localhost:${port}/api/logs`);
});