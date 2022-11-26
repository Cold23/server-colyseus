"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyRoom = void 0;
const colyseus_1 = require("colyseus");
const MyRoomState_1 = require("./schema/MyRoomState");
const matter_js_1 = __importDefault(require("matter-js"));
class MyRoom extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = 2;
    }
    addBounds() {
        const border = matter_js_1.default.Body.create({
            isStatic: true,
            restitution: 0.7,
            label: 'border',
        });
        matter_js_1.default.Body.setParts(border, [
            matter_js_1.default.Bodies.rectangle(70, 400, 50, 1000),
            matter_js_1.default.Bodies.rectangle(385, 42, 1000, 50),
            matter_js_1.default.Bodies.rectangle(385, 735, 1000, 50),
            matter_js_1.default.Bodies.rectangle(190, 75, 200, 50),
            matter_js_1.default.Bodies.rectangle(580, 75, 200, 50),
            matter_js_1.default.Bodies.rectangle(695, 400, 50, 1000),
            matter_js_1.default.Bodies.rectangle(190, 705, 200, 50),
            matter_js_1.default.Bodies.rectangle(580, 705, 200, 50),
        ]);
        matter_js_1.default.Body.setPosition(border, { x: 600, y: 389 });
        matter_js_1.default.World.add(this.state.world, border);
    }
    createPlayer(id, idx) {
        const pos = this.state.positions[idx];
        const player = matter_js_1.default.Bodies.circle(pos[0], pos[1], 30, {
            mass: 10,
            label: `player ${id}`,
            frictionAir: 0,
            friction: 0,
            isStatic: false,
        });
        const goalPos = this.state.goalPosition[idx];
        const goal = matter_js_1.default.Bodies.rectangle(goalPos[0], goalPos[1], 200, 100, {
            isSensor: true,
        });
        matter_js_1.default.World.add(this.state.world, player);
        this.state.entities.push({
            player,
            goal,
            score: 0,
            initialPos: pos,
        });
    }
    freezeAll() {
        // set velocities to 0
        this.state.entities.forEach((entity) => {
            matter_js_1.default.Body.setVelocity(entity.player, { x: 0, y: 0 });
        });
    }
    reset() {
        //set to initial pos and set velocity to 0
        this.state.entities.forEach((entity) => {
            matter_js_1.default.Body.setPosition(entity.player, {
                x: entity.initialPos[0],
                y: entity.initialPos[1],
            });
            matter_js_1.default.Body.setVelocity(this.state.ball, { x: 0, y: 0 });
        });
        matter_js_1.default.Body.setPosition(this.state.ball, { x: 600, y: 381 });
        matter_js_1.default.Body.setVelocity(this.state.ball, { x: 0, y: 0 });
        this.state.paused = false;
        this.setState(this.state);
    }
    setup() {
        this.state.engine = matter_js_1.default.Engine.create({});
        this.state.engine.gravity.y = 0;
        this.state.world = this.state.engine.world;
        this.state.runner = matter_js_1.default.Runner.create();
        this.state.ball = matter_js_1.default.Bodies.circle(600, 381 - 8, 12, {
            restitution: 1.0,
            mass: 0.1,
            frictionAir: 0.025,
            label: 'ball',
        });
        matter_js_1.default.World.add(this.state.world, this.state.ball);
        matter_js_1.default.Runner.run(this.state.runner, this.state.engine);
        this.addBounds();
    }
    onCreate(options) {
        this.setState(new MyRoomState_1.MyRoomState());
        this.clock.start();
        this.setup();
        this.onMessage('send', (client, message) => {
            console.log(message, ' from, ', client);
        });
        this.onMessage('ping', (client, { time }) => {
            client.send('pong', { time });
        });
        this.onMessage('dash', (client, { position, direction }) => {
            if (this.state.paused)
                return;
            this.state.entities.forEach((body) => {
                if (body.player.label.split(' ')[1] === client.sessionId) {
                    const oldDirection = { x: direction[0] * 6, y: direction[1] * 6 };
                    const dirLength = Math.sqrt(Math.pow(oldDirection.x, 2) + Math.pow(oldDirection.y, 2));
                    const dirNormalized = {
                        x: oldDirection.x / dirLength,
                        y: oldDirection.y / dirLength,
                    };
                    const currentPos = body.player.position;
                    const dirDiff = {
                        x: currentPos.x - position.x,
                        y: currentPos.y - position.y,
                    };
                    const dirLenghtCurrent = Math.sqrt(Math.pow(dirDiff.x, 2) + Math.pow(dirDiff.y, 2));
                    const dirNormalizedDiff = {
                        x: dirDiff.x / dirLenghtCurrent,
                        y: dirDiff.y / dirLenghtCurrent,
                    };
                    let dirFinal = {
                        x: dirNormalizedDiff.x + dirNormalized.x,
                        y: dirNormalizedDiff.y + dirNormalized.y,
                    };
                    if (Math.abs(dirNormalized.x - dirNormalizedDiff.x) < 0.01 &&
                        Math.abs(dirNormalized.y - dirNormalizedDiff.y) < 0.01) {
                        dirFinal = dirNormalized;
                    }
                    if (direction[0] === 0 && direction[1] === 0) {
                        dirFinal = { x: 0, y: -1 };
                    }
                    const dirFinalLength = Math.sqrt(Math.pow(dirFinal.x, 2) + Math.pow(dirFinal.y, 2));
                    const dirFinalNormalized = {
                        x: dirFinal.x / dirFinalLength,
                        y: dirFinal.y / dirFinalLength,
                    };
                    matter_js_1.default.Body.setVelocity(body.player, {
                        x: dirFinalNormalized.x * 30,
                        y: dirFinalNormalized.y * 30,
                    });
                    this.clock.setTimeout(() => {
                        matter_js_1.default.Body.setVelocity(body.player, oldDirection);
                    }, 150);
                }
            });
        });
        this.onMessage('velocity', (client, { velocity, startTime, dash }) => {
            if (this.state.paused)
                return;
            this.state.entities.forEach((body) => {
                if (body.player.label.split(' ')[1] === client.sessionId) {
                    matter_js_1.default.Body.setVelocity(body.player, {
                        x: velocity[0] * 6,
                        y: velocity[1] * 6,
                    });
                    if (dash) {
                        matter_js_1.default.Body.applyForce(body.player, {
                            x: body.player.position.x,
                            y: body.player.position.y,
                        }, {
                            x: velocity[0] * 100,
                            y: velocity[1] * 100,
                        });
                    }
                }
            });
        });
        matter_js_1.default.Events.on(this.state.engine, 'collisionStart', (ev) => {
            if (ev.pairs[0].bodyA.label !== 'ball' &&
                ev.pairs[0].bodyB.label !== 'ball')
                return;
            if (ev.pairs[0].bodyA.label.split(' ')[0] !== 'player' &&
                ev.pairs[0].bodyB.label.split(' ')[0] !== 'player')
                return;
            this.broadcast('ball-collide', { time: this.clock.elapsedTime });
        });
        matter_js_1.default.Events.on(this.state.runner, 'afterTick', (ev) => {
            const goal = {
                status: false,
                player: null,
            };
            if (!this.state.paused && this.state.entities.length >= 2) {
                this.state.entities.forEach((entity) => {
                    if (matter_js_1.default.Collision.collides(entity.goal, this.state.ball, null)) {
                        goal.status = true;
                        goal.player = entity.player.label.split(' ')[1];
                        entity.score += 1;
                        this.state.paused = true;
                        this.freezeAll();
                        this.setState(this.state);
                        this.clock.setTimeout(() => {
                            this.reset();
                        }, 1500);
                    }
                });
            }
            this.broadcast('tick', {
                players: this.state.entities.map((e) => ({
                    position: [e.player.position.x, e.player.position.y],
                    id: e.player.label.split(' ')[1],
                    score: e.score,
                })),
                ball: {
                    position: this.state.ball.position,
                },
                delta: ev.source.delta,
                time: this.clock.elapsedTime,
                goal: goal.status && goal,
                paused: this.state.paused,
            });
        });
    }
    onJoin(client, options) {
        this.createPlayer(client.sessionId, this.state.nextIdx);
        const player = new MyRoomState_1.Player(client.sessionId, this.state.positions[this.state.nextIdx]);
        this.state.players.push(player);
        this.state.nextIdx = 1;
        this.setState(this.state);
        console.log(client.sessionId, 'joined!');
        this.broadcast('joined', {
            state: this.state,
            time: this.clock.elapsedTime,
        });
    }
    onLeave(client, consented) {
        this.state.players = this.state.players.filter((e, idx) => {
            if (e.id === client.sessionId) {
                this.state.nextIdx = idx;
                return false;
            }
            return true;
        });
        this.setState(this.state);
        console.log(client.sessionId, 'left!');
        this.state.entities = this.state.entities.filter((e) => {
            if (e.player.label.split(' ')[1] === client.sessionId) {
                matter_js_1.default.World.remove(this.state.world, e.player);
                matter_js_1.default.World.remove(this.state.world, e.goal);
                return false;
            }
            return true;
        });
        this.broadcast('left', { state: this.state, time: this.clock.elapsedTime });
    }
    onDispose() {
        console.log('room', this.roomId, 'disposing...');
    }
}
exports.MyRoom = MyRoom;
