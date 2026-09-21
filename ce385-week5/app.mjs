import express from "express";

const app = express();
app.use(express.json());
const TODOS = [
    { id: "1", title: "อ่านสไลด์สัปดาห์ที่ 5", done: true, priority: "high" },
    { id: "2", title: "ติดตั้ง Express", done: true, priority: "high" },
    { id: "3", title: "ทำ Workshop 4", done: false, priority: "normal" },
    { id: "4", title: "เตรียมสอบกลางภาค", done: false, priority: "low" },
];

const PRIORITIES = ["high", "normal", "low"];

function validateTodo(req, res, next) {
    const { title, priority } = req.body ?? {};

    if (typeof title !== "string" || title.trim() === "") {
        return res.status(400).json({ error: "ต้องมี title เป็นข้อความ" });
    }
    if (priority !== undefined && !PRIORITIES.includes(priority)) {
        return res.status(400).json({ error: "priority ไม่ถูกต้อง" });
    }
    return next();
}

const todoRouter = express.Router();

todoRouter.get("/health", (req, res) => {
    res.json({ status: "ok"});
});

// แก้ไข 1: เปลี่ยนจาก "/todos" เป็น "/"
todoRouter.get("/", (req, res) => {
    res.json(TODOS.map((t) => ({...t})));
});

todoRouter.get("/:id", (req,res) => {
    // แก้ไข 2: ประกาศตัวแปร todo และใช้ Backtick (`)
    const todo = TODOS.find((t) => t.id === req.params.id);
    if (!todo) {
        return res.status(404).json({ error: `ไม่พบรายการ ${req.params.id}` });
    }
    return res.json({ ...todo });
});

// แก้ไข 1: เปลี่ยนจาก "/todos" เป็น "/"
todoRouter.post("/", validateTodo, (req, res) => {
    const created = {
        id: String(TODOS.length + 1),
        title: req.body.title,
        done: false,
        priority: req.body.priority ?? "normal",
    };
    TODOS.push(created);
    res.status(201).json({ ...created });
});

// Path ตั้งต้นคือ /api/v1/todos อยู่แล้ว
app.use("/api/v1/todos", todoRouter);

app.listen(3000, () => {
    console.log("เซิร์ฟเวอร์ทำงานที่ http://localhost:3000");
});