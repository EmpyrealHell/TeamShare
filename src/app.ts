//our root app component
import {Component, NgModule, VERSION} from '@angular/core'
import {BrowserModule} from '@angular/platform-browser'
import { FormsModule }   from '@angular/forms';

export class Pairing {
  partner:Player;
  lastPlay:number;
  constructor(partner:Player, round:number) {
    this.partner = partner;
    this.lastPlay = round;
  }
}

export class Player {
  name:string;
  lastPlay:number;
  streak:number;
  pairings:Pairing[];
  constructor(name:string) {
    this.name = name;
    this.Reset();
  }
  Reset() {
    this.lastPlay = 0;
    this.streak = 0;
    this.pairings = [];
  }
  PlayWith(other:Player, round:number) {
    if (this.lastPlay == round - 1)
      this.streak++;
    else
      this.streak = 1;
    this.lastPlay = round;
    for (var i = 0; i < this.pairings.length; i++) {
      if (this.pairings[i].partner === other) {
        this.pairings[i].lastPlay = round;
        return;
      }
    }
    this.pairings.push(new Pairing(other, round));
  }
  PartnerStaleness(other:Player, round:number) {
    for (var i = 0; i < this.pairings.length; i++) {
      if (this.pairings[i].partner === other)
        return round - this.pairings[i].lastPlay;
    }
    return round;
  }
  PlayerStaleness(round:number) {
    return (round - this.lastPlay) - this.streak;
  }
}

export class Team {
  member1:Player;
  member2:Player;
  constructor(player1:Player, player2:Player) {
    this.member1 = player1;
    this.member2 = player2;
  }
  CanPlay(other:Team) {
    return this.member1 !== other.member1
      && this.member1 !== other.member2
      && this.member2 !== other.member1
      && this.member2 !== other.member2;
  }
  Play(round:number) {
    this.member1.PlayWith(this.member2, round);
    this.member2.PlayWith(this.member1, round);
  }
  TeamStaleness(round:number) {
    return this.member1.PartnerStaleness(this.member2, round);
  }
  PlayerStaleness(round:number) {
    return this.member1.PlayerStaleness(round) + this.member2.PlayerStaleness(round);
  }
  HasPlayer(player:Player) {
    return this.member1 == player || this.member2 == player;
  }
  Is(team:Team) {
    return this.member1 == team.member1 && this.member2 == team.member2;
  }
  get Description() {
    return this.member1.name + '<br>' + this.member2.name;
  }
}

export class Match {
  team1:Team;
  team2:Team;
  constructor(team1:Team, team2:Team) {
    this.team1 = team1;
    this.team2 = team2;
  }
  Play(round:number) {
    this.team1.Play(round);
    this.team2.Play(round);
  }
  TeamStaleness(round:number) {
    return this.team1.TeamStaleness(round) + this.team2.TeamStaleness(round);
  }
  PlayerStaleness(round:number) {
    return this.team1.PlayerStaleness(round) + this.team2.PlayerStaleness(round);
  }
  HasPlayer(player:Player) {
    return this.team1.HasPlayer(player) || this.team2.HasPlayer(player);
  }
  get Description() {
    return this.team1.Description + ' vs. ' + this.team2.Description;
  }
}

export class Streak {
  player:Player;
  start:number;
  end:number;
  constructor(player:Player, round:number) {
    this.player = player;
    this.start = round;
    this.end = round;
  }
  get length() {
    return this.end - this.start + 1;
  }
}

export class Meta {
  longestIn:Streak;
  longestOut:Streak;
  shortestIn:Streak;
  shortestOut:Streak;
  matchCount:number;
  constructor(longestIn:Streak, longestOut:Streak, shortestIn:Streak, shortestOut:Streak, matchCount:number) {
    this.longestIn = longestIn;
    this.longestOut = longestOut;
    this.shortestIn = shortestIn;
    this.shortestOut = shortestOut;
    this.matchCount = matchCount;
  }
}

@Component({
  selector: 'my-app',
  template: `
    <header class='navbar navbar-dark bg-dark'>
      <div class='navbar-brand'>Team Builder</div>
    </header>
    <div class='container mt-2'>
      <div class='row'>
        <div class='col-4'>
          <h3>Members</h3>
          <form>
            <div class='input-group mb-3'>
              <label for='name' class='sr-only'>Password</label>
              <input type='text' class='form-control' name='name' id='name' placeholder='Name' [(ngModel)]='name'>
              <div class='input-group-append'>
                <button type='submit' class='btn btn-primary' (click)='AddEntrant()'>Add</button>
              </div>
            </div>
          </form>
          <div class='list-group' *ngIf='entities.length > 0'>
            <div *ngFor='let entity of entities; let i = index; let first = first; let last = last' class='list-group-item clearfix'>
              {{entity.name}}
              <span class='float-right'>
                <a href='#' (click)='Shift(i, -1)' class='badge' [class.badge-secondary]='first' [class.badge-primary]='!first'><i class='fa fa-arrow-up' aria-hidden='true'></i></a>
                <a href='#' (click)='Shift(i, 1)' class='badge' [class.badge-secondary]='last' [class.badge-primary]='!last'><i class='fa fa-arrow-down' aria-hidden='true'></i></a>
                <a href='#' (click)='Remove(i)' class='badge badge-danger'><i class='fa fa-ban' aria-hidden='true'></i></a>
              </span>
            </div>
          </div>
          <h3>Match List</h3>
          <div class='list-group' *ngIf='matches.length > 0'>
            <a *ngFor='let match of matches; let i = index; let first = first; let last = last' class='list-group-item' href='#' (click)='ToggleState(i)' [class.list-group-item-primary]='this.done[i]'>
              {{i + 1}}
              <span class='badge badge-primary'>{{match.team1.member1.name}}<br>{{match.team1.member2.name}}</span>
              vs.
              <span class='badge badge-danger'>{{match.team2.member1.name}}<br>{{match.team2.member2.name}}</span>
            </a>
          </div>
        </div>
        <div class='col-8'>
          <h3>Round Robin</h3>
          <p>
            <button type='button' (click)='RebuildBracket()' class='btn btn-primary' [disabled]='entities.length < 5'>Build</button>
            <button type='button' (click)='BuildBracket()' class='btn btn-primary' [disabled]='entities.length < 5'>Update</button>
          </p>
          <table class='table table-sm'>
            <thead>
              <tr>
                <th scope='col'>#</th>
                <th scope='col' *ngFor='let entity of entities'>{{entity.name}}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor='let match of matches; let i = index' (click)='ToggleState(i)' [class.table-primary]='this.done[i]'>
                <th scope='row'>{{i + 1}}</th>
                <td *ngFor='let entity of entities'>
                  <span *ngIf='this.IsInMatch(match, entity)' class='badge' [class.badge-primary]='this.IsOnTeam(match.team1, entity)' [class.badge-danger]='this.IsOnTeam(match.team2, entity)'><i class="fa fa-user" aria-hidden="true"></i></span>
                  &nbsp;
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class App {
  entities:Player[];
  name:string;
  matches:Match[];
  done:bool[];
  meta:Meta;
  constructor() {
    this.entities = [];
    this.matches = [];
    this.done = [];
    this.meta = null;
    this.round = 0;
  }
  AddEntrant() {
    this.entities.push(new Player(this.name));
    this.name = '';
  }
  Shift(index:number, amount:number) {
    if (index + amount >= 0 && index + amount < this.entities.length) {
      var temp = this.entities[index];
      this.entities[index] = this.entities[index + amount];
      this.entities[index + amount] = temp;
    }
  }
  Remove(index:number) {
    this.entities.splice(index, 1);
  }
  RunMatch(allMatches:Match[], match:Match) {
    this.matches.push(match);
    match.Play(this.matches.length);
    allMatches.splice(allMatches.indexOf(match), 1);
  }
  RebuildBracket() {
    for (var i = 0; i < this.done.length; i++)
      this.done[i] = false;
    this.BuildBracket();
  }
  ToggleState(index:number) {
    this.done[index] = !this.done[index];
  }
  IsInMatch(match:Match, entity:Player) {
    return this.IsOnTeam(match.team1, entity) || this.IsOnTeam(match.team2, entity);
  }
  IsOnTeam(team:Team, entity:Player) {
    return team.member1 == entity || team.member2 == entity;
  }
  Analyze() {
    var longestInStreak = null;
    var longestOutStreak = null;
    var shortestInStreak = null;
    var shortestOutStreak = null;
    for (var i = 0; i < this.entities.length; i++) {
      var inStreaks = [];
      var outStreaks = [];
      var currentInStreak = null;
      var currentOutStreak = null;
      var currentPlayer = this.entities[i];
      for (var j = 0; j < this.matches.length; j++) {
        if (this.matches[j].HasPlayer(currentPlayer)) {
          if (currentInStreak != null) {
            currentInStreak.end = j;
          } else {
            currentInStreak = new Streak(currentPlayer, j);
            if (currentOutStreak != null) {
              outStreaks.push(currentOutStreak);
              currentOutStreak = null;
            }
          }
        } else {
          if (currentOutStreak != null) {
            currentOutStreak.end = j;
          } else {
            currentOutStreak = new Streak(currentPlayer, j);
            if (currentInStreak != null) {
              inStreaks.push(currentInStreak);
              currentInStreak = null;
            }
          }
        }
      }
      if (currentInStreak != null)
        inStreaks.push(currentInStreak);
      if (currentOutStreak != null)
        outStreaks.push(currentOutStreak);
      for (var j = 0; j < inStreaks.length; j++) {
        if (longestInStreak == null || inStreaks[j].length > longestInStreak.length)
          longestInStreak = inStreaks[j];
      }
      for (var j = 0; j < outStreaks.length; j++) {
        if (longestOutStreak == null || outStreaks[j].length > longestOutStreak.length)
          longestOutStreak = outStreaks[j];
      }
      for (var j = 0; j < inStreaks.length; j++) {
        if (shortestInStreak == null || inStreaks[j].length < shortestInStreak.length)
          shortestInStreak = inStreaks[j];
      }
      for (var j = 0; j < outStreaks.length; j++) {
        if (shortestOutStreak == null || outStreaks[j].length < shortestOutStreak.length)
          shortestOutStreak = outStreaks[j];
      }
    }
    
    this.meta = new Meta(longestInStreak, longestOutStreak, shortestInStreak, shortestOutStreak, this.matches.length);
  }
  IsCarryover(allMatches:Match[], carryover:number, team1:Team, team2:Team) {
    for (var i = 0; i < carryover; i++) {
      if ((allMatches[i].team1.Is(team1) || allMatches[i].team2.Is(team1))
        && (allMatches[i].team1.Is(team2) || allMatches[i].team2.Is(team2)))
        return true;
    }
    return false;
  }
  BuildBracket() {
    var teams = [];
    var allMatches = [];
    for (var i = 0; i < this.matches.length; i++) {
      if (this.done[i])
        allMatches.push(this.matches[i]);
    }
    var carryover = allMatches.length;
    this.matches = [];
    this.matches.length = 0;
    this.done = [];
    this.done.length = 0;

    for (var i = 0; i < this.entities.length; i++) {
      this.entities[i].Reset();
      for (var j = i + 1; j < this.entities.length; j++) {
        teams.push(new Team(this.entities[i], this.entities[j]));
      }
    }
    for (var i = 0; i < teams.length; i++) {
      for (var j = i + 1; j < teams.length; j++) {
        if (teams[i].CanPlay(teams[j]) && !this.IsCarryover(allMatches, carryover, teams[i], teams[j]))
          allMatches.push(new Match(teams[i], teams[j]));
      }
    }

    for (var i = 0; i < carryover; i++)
      this.RunMatch(allMatches, allMatches[0]);
    while (allMatches.length > 0) {
      var round = this.matches.length;
      var nextMatch = allMatches[0];
      for (var i = 1; i < allMatches.length; i++) {
        var match = allMatches[i];
        var nextPlayerStaleness = nextMatch
        if (match.PlayerStaleness(round) > nextMatch.PlayerStaleness(round)) {
          nextMatch = match;
        } else if (match.PlayerStaleness(round) === nextMatch.PlayerStaleness(round)) {
          if (match.TeamStaleness(round) > nextMatch.TeamStaleness(round))
            nextMatch = match;
        }
      }
      this.RunMatch(allMatches, nextMatch);
    }
    
    for (var i = 0; i < this.matches.length; i++) {
      this.done.push(i < carryover);
    }
    
    this.Analyze();
  }
}

@NgModule({
  imports: [ BrowserModule, FormsModule ],
  declarations: [ App ],
  bootstrap: [ App ]
})
//TODO: Fix people disappearing from the table when removed from the user list, fix weird spacing on first column
export class AppModule {}