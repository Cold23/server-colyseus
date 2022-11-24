import { Schema, type } from '@colyseus/schema'
import Matter from 'matter-js'

export class Player extends Schema {
  @type('string') id: string
  @type(['number']) position: number[]

  constructor(id: string, position: number[]) {
    super()

    this.id = id
    this.position = position
  }
}

export class MyRoomState extends Schema {
  @type([Player]) players: Player[]
  @type(['number']) nextPos: number[]
  @type('boolean') paused: boolean

  world: Matter.World
  engine: Matter.Engine
  runner: Matter.Runner

  entities: {
    player: Matter.Body
    goal: Matter.Body
    score: number
    initialPos: number[]
  }[]

  ball: Matter.Body

  positions: number[][] = [
    [600, 581],
    [600, 181],
  ]
  goalPosition: number[][] = [
    [600, 20],
    [600, 720],
  ]

  nextIdx: number

  constructor() {
    super()
    this.paused = false
    this.nextIdx = 0
    this.entities = []
    this.nextPos = this.positions[0]
    this.players = []
  }
}
