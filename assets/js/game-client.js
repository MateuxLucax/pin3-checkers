import { arePositionsEqual } from '/assets/js/board.js';
import BoardView from '/assets/js/BoardView.js';
import { Status, CheckersState } from '/assets/js/game-state.js'
import * as mm from '/assets/js/minimax.js'

export class GameClient {

  #animating = false

  constructor(againstAI, captureOptions, container, aiParameters={}) {
    const checkers = new CheckersState(captureOptions);
    if (againstAI) {
      const maximizeWhite = false // player is white
      const heuristic = mm[aiParameters.heuristic]
      const depth = aiParameters.depth
      const minimax = new mm.Minimax(maximizeWhite, heuristic, depth)
      this.minimax = minimax;
    }

    const view = new BoardView(checkers.board, container);
    view.onClick((row, col, marked) => {
      if (!this.selectedSource) {
        if (marked) {
          this.waitDestinationSelection(row, col)
        }
      } else {
        if (!marked) {
          this.waitSourceSelection()
        } else {
          this.handleDestinationSelection(row, col)
        }
      }
    })

    this.againstAI = againstAI
    this.checkers = checkers
    this.view = view
    this.actionStack = []

    this.waitSourceSelection()
  }

  waitSourceSelection() {
    console.log('waitSourceSelection')
    this.selectedSource = null
    this.view.resetMarks(this.checkers.actions.map(it => it.from))
  }

  waitDestinationSelection(row, col) {
    console.log('waitDestinationSelection', row, col)
    this.selectedSource = { row, col }
    this.view.resetMarks(
      this.checkers.actions
      .filter(it => arePositionsEqual(it.from, this.selectedSource))
      .map(it => it.sequence[it.sequence.length-1])
    )
  }

  checkStatus() {
    if (this.checkers.status == Status.playing) return
    let msg = ''
    switch (this.checkers.status) {
      case Status.whiteWon: msg = 'White won!'; break
      case Status.blackWon: msg = 'Black won!'; break
      case Status.draw: msg = 'Draw...'; break
    }
    alert(msg)
    location.reload()
  }

  handleDestinationSelection(row, col) {
    console.log('handleDestinationSelection', row, col)

    const source = this.selectedSource
    const destination = { row, col }
    const possibleActions = this.checkers.actions.filter(it => {
      return arePositionsEqual(it.from, source) && arePositionsEqual(it.sequence[it.sequence.length-1], destination)
    })
    const actionTaken = possibleActions[0]
    
    this.#actionDo(actionTaken)
    this.view.clearMarks()

    this.#animating = true
    this.view.animateActionDo(actionTaken).then(() => {
      this.checkStatus()

      if (this.againstAI) {
        const { action: aiAction } = this.minimax.val(this.checkers)
        this.#actionDo(aiAction)
        this.view.animateActionDo(aiAction).then(() => {
          this.checkStatus()
          this.waitSourceSelection()
          this.#animating = false
        })
      } else {
        this.waitSourceSelection()
        this.#animating = false
      }

    })
  }

  #actionDo(action) {
    this.checkers.actionDo(action)
    this.actionStack.push(action)
  }

  #prevActionUndo() {
    if (this.actionStack.length == 0) return
    const action = this.actionStack.pop()
    this.checkers.actionUndo(action)
    return action
  }

  undo() {
    if (this.#animating) return
    if (this.actionStack.length == 0) return
    console.log('undo')

    this.view.clearMarks()

    this.#animating = true
    const action = this.#prevActionUndo()
    this.view.animateActionUndo(action).then(() => {
      if (this.againstAI) {
        const action = this.#prevActionUndo()
        this.view.animateActionUndo(action).then(() => {
          this.waitSourceSelection()
          this.#animating = false
        })
      } else {
        this.waitSourceSelection()
        this.#animating = false
      }
    })
  }

}