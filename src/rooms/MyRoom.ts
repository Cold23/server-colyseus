import { Room, Client } from 'colyseus'
import { MyRoomState, Player } from './schema/MyRoomState'
import Matter, { Bounds } from 'matter-js'

export class MyRoom extends Room<MyRoomState> {
  maxClients: number = 2

  addBounds() {
    const border = Matter.Body.create({
      isStatic: true,
      restitution: 0.7,
      label: 'border',
    })
    Matter.Body.setParts(border, [
      Matter.Bodies.rectangle(70, 400, 50, 1000),
      Matter.Bodies.rectangle(385, 42, 1000, 50),
      Matter.Bodies.rectangle(385, 735, 1000, 50),
      Matter.Bodies.rectangle(190, 75, 200, 50),
      Matter.Bodies.rectangle(580, 75, 200, 50),
      Matter.Bodies.rectangle(695, 400, 50, 1000),
      Matter.Bodies.rectangle(190, 705, 200, 50),
      Matter.Bodies.rectangle(580, 705, 200, 50),
    ])
    Matter.Body.setPosition(border, { x: 600, y: 389 })
    Matter.World.add(this.state.world, border)
  }

  createPlayer(id: string, idx: number) {
    const pos = this.state.positions[idx]
    const player = Matter.Bodies.circle(pos[0], pos[1], 30, {
      mass: 10,
      label: `player ${id}`,
      frictionAir: 0,
      friction: 0,
      isStatic: false,
    })
    const goalPos = this.state.goalPosition[idx]
    const goal = Matter.Bodies.rectangle(goalPos[0], goalPos[1], 200, 100, {
      isSensor: true,
    })
    Matter.World.add(this.state.world, player)
    this.state.entities.push({
      player,
      goal,
      score: 0,
      initialPos: pos,
    })
  }

  freezeAll() {
    // set velocities to 0
    this.state.entities.forEach((entity) => {
      Matter.Body.setVelocity(entity.player, { x: 0, y: 0 })
    })
  }

  isBallOut() {
    const pos = this.state.ball.position
    return pos.x > 1200 || pos.x < 0 || pos.y < 0 || pos.y > 800
  }
  reset() {
    //set to initial pos and set velocity to 0
    this.state.entities.forEach((entity) => {
      Matter.Body.setPosition(entity.player, {
        x: entity.initialPos[0],
        y: entity.initialPos[1],
      })
      Matter.Body.setVelocity(this.state.ball, { x: 0, y: 0 })
    })
    Matter.Body.setPosition(this.state.ball, { x: 600, y: 381 })
    Matter.Body.setVelocity(this.state.ball, { x: 0, y: 0 })
    this.state.paused = false
    this.setState(this.state)
  }

  setup() {
    this.state.engine = Matter.Engine.create({})
    this.state.engine.gravity.y = 0
    this.state.world = this.state.engine.world
    this.state.runner = Matter.Runner.create()
    this.state.ball = Matter.Bodies.circle(600, 381 - 8, 12, {
      restitution: 1.0,
      mass: 0.1,
      frictionAir: 0.025,
      label: 'ball',
    })

    Matter.World.add(this.state.world, this.state.ball)
    Matter.Runner.run(this.state.runner, this.state.engine)
    this.addBounds()
  }

  onCreate(options: any) {
    this.setState(new MyRoomState())
    this.clock.start()
    this.setup()
    this.onMessage('send', (client, message) => {
      console.log(message, ' from, ', client)
    })
    this.onMessage('ping', (client, { time }) => {
      client.send('pong', { time })
    })
    this.onMessage('dash', (client, { position, direction }) => {
      if (this.state.paused) return
      this.state.entities.forEach((body) => {
        if (body.player.label.split(' ')[1] === client.sessionId) {
          Matter.Body.setVelocity(body.player, {
            x: direction[0] * 16,
            y: direction[1] * 16,
          })
          this.clock.setTimeout(() => {
            Matter.Body.setVelocity(body.player, {
              x: direction[0] * 6,
              y: direction[1] * 6,
            })
          }, 150)
        }
      })
    })
    this.onMessage('velocity', (client, { velocity, startTime, dash }) => {
      if (this.state.paused) return
      this.state.entities.forEach((body) => {
        if (body.player.label.split(' ')[1] === client.sessionId) {
          Matter.Body.setVelocity(body.player, {
            x: velocity[0] * 6,
            y: velocity[1] * 6,
          })
          if (dash) {
            Matter.Body.applyForce(
              body.player,
              {
                x: body.player.position.x,
                y: body.player.position.y,
              },
              {
                x: velocity[0] * 100,
                y: velocity[1] * 100,
              },
            )
          }
        }
      })
    })
    Matter.Events.on(this.state.engine, 'collisionStart', (ev) => {
      if (
        ev.pairs[0].bodyA.label !== 'ball' &&
        ev.pairs[0].bodyB.label !== 'ball'
      )
        return
      if (
        ev.pairs[0].bodyA.label.split(' ')[0] !== 'player' &&
        ev.pairs[0].bodyB.label.split(' ')[0] !== 'player'
      )
        return
      this.broadcast('ball-collide', { time: this.clock.elapsedTime })
    })
    Matter.Events.on(this.state.runner, 'afterTick', (ev) => {
      const goal = {
        status: false,
        player: null as any,
      }
      let out = false
      if (this.isBallOut() && !this.state.paused) {
        this.freezeAll()
        Matter.Body.setVelocity(this.state.ball, { x: 0, y: 0 })
        out = true
        this.state.paused = true
        this.setState(this.state)
        this.clock.setTimeout(() => {
          this.reset()
        }, 1500)
      } else if (!this.state.paused && this.state.entities.length >= 2) {
        this.state.entities.forEach((entity) => {
          if (Matter.Collision.collides(entity.goal, this.state.ball, null)) {
            goal.status = true
            goal.player = entity.player.label.split(' ')[1]
            entity.score += 1
            this.state.paused = true
            this.freezeAll()
            this.setState(this.state)
            this.clock.setTimeout(() => {
              this.reset()
            }, 1500)
          }
        })
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
        out: out,
        delta: ev.source.delta,
        time: this.clock.elapsedTime,
        goal: goal.status && goal,
        paused: this.state.paused,
      })
    })
  }

  onJoin(client: Client, options: any) {
    this.createPlayer(client.sessionId, this.state.nextIdx)
    const player = new Player(
      client.sessionId,
      this.state.positions[this.state.nextIdx],
      this.state.nextIdx,
    )
    this.state.players.push(player)
    this.state.nextIdx = (this.state.nextIdx + 1) % 2
    this.setState(this.state)
    console.log(client.sessionId, 'joined!')
    this.broadcast('joined', {
      state: this.state,
      time: this.clock.elapsedTime,
    })
  }

  onLeave(client: Client, consented: boolean) {
    this.state.players = this.state.players.filter((e, idx) => {
      if (e.id === client.sessionId) {
        this.state.nextIdx = e.order
        return false
      }
      return true
    })
    this.setState(this.state)
    console.log(client.sessionId, 'left!')
    this.state.entities = this.state.entities.filter((e) => {
      if (e.player.label.split(' ')[1] === client.sessionId) {
        Matter.World.remove(this.state.world, e.player)
        Matter.World.remove(this.state.world, e.goal)
        return false
      }
      return true
    })
    this.broadcast('left', { state: this.state, time: this.clock.elapsedTime })
  }

  onDispose() {
    console.log('room', this.roomId, 'disposing...')
  }
}
