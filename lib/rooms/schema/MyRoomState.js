"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyRoomState = exports.Player = void 0;
const schema_1 = require("@colyseus/schema");
class Player extends schema_1.Schema {
    constructor(id, position) {
        super();
        this.id = id;
        this.position = position;
    }
}
__decorate([
    (0, schema_1.type)('string')
], Player.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)(['number'])
], Player.prototype, "position", void 0);
exports.Player = Player;
class MyRoomState extends schema_1.Schema {
    constructor() {
        super();
        this.positions = [
            [600, 581],
            [600, 181],
        ];
        this.goalPosition = [
            [600, 20],
            [600, 720],
        ];
        this.paused = false;
        this.nextIdx = 0;
        this.entities = [];
        this.nextPos = this.positions[0];
        this.players = [];
    }
}
__decorate([
    (0, schema_1.type)([Player])
], MyRoomState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)(['number'])
], MyRoomState.prototype, "nextPos", void 0);
__decorate([
    (0, schema_1.type)('boolean')
], MyRoomState.prototype, "paused", void 0);
exports.MyRoomState = MyRoomState;
