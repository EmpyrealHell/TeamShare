import { Component, NgModule, VERSION } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';


export class Pairing {
  partner: Player;
  lastPlay: number;
  constructor(partner: Player, round: number) {
    this.partner = partner;
    this.lastPlay = round;
  }
}

export class Player {
  name: string;
  lastPlay: number;
  streak: number;
  pairings: Pairing[];
  constructor(name: string) {
    this.name = name;
    this.Reset();
  }
  Reset() {
    this.lastPlay = 0;
    this.streak = 0;
    this.pairings = [];
  }
  PlayWith(other: Player, round: number) {
    if (this.lastPlay === round - 1) {
      this.streak++;
    } else {
      this.streak = 1;
    }
    this.lastPlay = round;
    for (let i = 0; i < this.pairings.length; i++) {
      if (this.pairings[i].partner === other) {
        this.pairings[i].lastPlay = round;
        return;
      }
    }
    this.pairings.push(new Pairing(other, round));
  }
  PartnerStaleness(other: Player, round: number) {
    for (let i = 0; i < this.pairings.length; i++) {
      if (this.pairings[i].partner === other) {
        return round - this.pairings[i].lastPlay;
      }
    }
    return round;
  }
  PlayerStaleness(round: number) {
    return (round - this.lastPlay) - this.streak;
  }
}

export class Team {
  member1: Player;
  member2: Player;
  constructor(player1: Player, player2: Player) {
    this.member1 = player1;
    this.member2 = player2;
  }
  CanPlay(other: Team) {
    return this.member1 !== other.member1
      && this.member1 !== other.member2
      && this.member2 !== other.member1
      && this.member2 !== other.member2;
  }
  Play(round: number) {
    this.member1.PlayWith(this.member2, round);
    this.member2.PlayWith(this.member1, round);
  }
  TeamStaleness(round: number) {
    return this.member1.PartnerStaleness(this.member2, round);
  }
  PlayerStaleness(round: number) {
    return this.member1.PlayerStaleness(round) + this.member2.PlayerStaleness(round);
  }
  HasPlayer(player: Player) {
    return this.member1 === player || this.member2 === player;
  }
  Is(team: Team) {
    return this.member1 === team.member1 && this.member2 === team.member2;
  }
  get Description() {
    return this.member1.name + '<br>' + this.member2.name;
  }
}

export class Match {
  team1: Team;
  team2: Team;
  constructor(team1: Team, team2: Team) {
    this.team1 = team1;
    this.team2 = team2;
  }
  Play(round: number) {
    this.team1.Play(round);
    this.team2.Play(round);
  }
  TeamStaleness(round: number) {
    return this.team1.TeamStaleness(round) + this.team2.TeamStaleness(round);
  }
  PlayerStaleness(round: number) {
    return this.team1.PlayerStaleness(round) + this.team2.PlayerStaleness(round);
  }
  HasPlayer(player: Player) {
    return this.team1.HasPlayer(player) || this.team2.HasPlayer(player);
  }
  get Description() {
    return this.team1.Description + ' vs. ' + this.team2.Description;
  }
}

export class Streak {
  start: number;
  end: number;
  isIn: boolean;
  constructor(round: number, isIn: boolean) {
    this.start = round;
    this.end = round;
    this.isIn = isIn;
  }
  get length() {
    return this.end - this.start + 1;
  }
}

export class PlayerMeta {
  player: Player;
  streaks: Streak[];
  shortestIn: number;
  shortestOut: number;
  longestIn: number;
  longestOut: number;
  averageIn: number;
  averageOut: number;
  totalIn: number;
  constructor(player: Player) {
    this.player = player;
    this.streaks = [];
  }
  ProcessNextRound(isIn: boolean) {
    if (this.streaks.length === 0) {
      this.streaks.push(new Streak(0, isIn));
    } else {
      const last = this.streaks[this.streaks.length - 1];
      if (last.isIn === isIn) {
        last.end++;
      } else {
        this.streaks.push(new Streak(last.end + 1, isIn));
      }
    }
  }
  Analyze() {
    const last = this.streaks[this.streaks.length - 1];
    this.shortestIn = this.shortestOut = last.end;
    this.longestIn = this.longestOut = this.totalIn = 0;
    let inCount = 0, inTimes = 0;
    let outCount = 0, outTimes = 0;
    for (let i = 0; i < this.streaks.length; i++) {
      const current = this.streaks[i];
      if (current.isIn) {
        if (current.length < this.shortestIn) { this.shortestIn = current.length; }
        if (current.length > this.longestIn) { this.longestIn = current.length; }
        this.totalIn += current.length;
        inCount += current.length;
        inTimes++;
      } else {
        if (current.length < this.shortestOut) { this.shortestOut = current.length; }
        if (current.length > this.longestOut) { this.longestOut = current.length; }
        outCount += current.length;
        outTimes++;
      }
    }
    this.averageIn = inCount / inTimes;
    this.averageOut = outCount / outTimes;
  }
}

export class Stat {
  name: string;
  player: Player;
  value: number;
  constructor(name: string, player: Player, value: number) {
    this.name = name;
    this.player = player;
    this.value = value;
  }
  get playerName() {
    if (this.player === null) {
      return '-';
    }
    return this.player.name;
  }
}

export class Meta {
  stats: Stat[];
  constructor() {
    this.stats = [];
  }
  AddStat(name: string, player: Player, value: number) {
    this.stats.push(new Stat(name, player, value));
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  entities: Player[];
  allPlayers: Player[];
  name: string;
  matches: Match[];
  done: boolean[];
  meta: Meta;
  round: number;
  isDirty: boolean;
  constructor() {
    this.entities = [];
    this.allPlayers = [];
    this.matches = [];
    this.done = [];
    this.meta = new Meta();
    this.round = 0;
    this.isDirty = false;
  }
  AddEntrant() {
    this.entities.push(new Player(this.name));
    this.name = '';
    this.isDirty = true;
  }
  Shift(index: number, amount: number) {
    if (index + amount >= 0 && index + amount < this.entities.length) {
      const temp = this.entities[index];
      this.entities[index] = this.entities[index + amount];
      this.entities[index + amount] = temp;
      this.isDirty = true;
    }
  }
  Remove(index: number) {
    this.entities.splice(index, 1);
    this.isDirty = true;
  }
  AddUniquePlayer(player: Player) {
    if (this.allPlayers.indexOf(player) === -1) {
      this.allPlayers.push(player);
    }
  }
  RunMatch(allMatches: Match[], match: Match) {
    this.matches.push(match);
    this.AddUniquePlayer(match.team1.member1);
    this.AddUniquePlayer(match.team1.member2);
    this.AddUniquePlayer(match.team2.member1);
    this.AddUniquePlayer(match.team2.member2);
    match.Play(this.matches.length);
    allMatches.splice(allMatches.indexOf(match), 1);
  }
  RebuildBracket() {
    for (let i = 0; i < this.done.length; i++) {
      this.done[i] = false;
    }
    this.BuildBracket();
  }
  ToggleState(index: number) {
    this.done[index] = !this.done[index];
  }
  IsInMatch(match: Match, entity: Player) {
    return this.IsOnTeam(match.team1, entity) || this.IsOnTeam(match.team2, entity);
  }
  IsOnTeam(team: Team, entity: Player) {
    return team.member1 === entity || team.member2 === entity;
  }
  Analyze() {
    const playerMeta: PlayerMeta[] = [];
    for (let i = 0; i < this.entities.length; i++) {
      const currentPlayer = this.entities[i];
      const meta = new PlayerMeta(currentPlayer);
      playerMeta.push(meta);
      for (let j = 0; j < this.matches.length; j++) {
        meta.ProcessNextRound(this.matches[j].HasPlayer(currentPlayer));
      }
      meta.Analyze();
    }
    let longestIn = playerMeta[0];
    let longestOut = playerMeta[0];
    let shortestIn = playerMeta[0];
    let shortestOut = playerMeta[0];
    let longestAvgIn = playerMeta[0];
    let longestAvgOut = playerMeta[0];
    let shortestAvgIn = playerMeta[0];
    let shortestAvgOut = playerMeta[0];
    let most = playerMeta[0];
    let least = playerMeta[0];
    for (let i = 1; i < playerMeta.length; i++) {
      const current = playerMeta[i];
      if (current.longestIn > longestIn.longestIn) { longestIn = current; }
      if (current.longestOut > longestOut.longestOut) { longestOut = current; }
      if (current.shortestIn < shortestIn.shortestIn) { shortestIn = current; }
      if (current.shortestOut < shortestOut.shortestOut) { shortestOut = current; }
      if (current.averageIn > longestAvgIn.averageIn) { longestAvgIn = current; }
      if (current.averageOut > longestAvgOut.averageOut) { longestAvgOut = current; }
      if (current.averageIn < shortestAvgIn.averageIn) { shortestAvgIn = current; }
      if (current.averageOut < shortestAvgOut.averageOut) { shortestAvgOut = current; }
      if (current.totalIn > most.totalIn) { most = current; }
      if (current.totalIn < least.totalIn) { least = current; }
    }
    this.meta = new Meta();
    this.meta.AddStat('Match Count', null, this.matches.length);
    this.meta.AddStat('Most Played', most.player, most.totalIn);
    this.meta.AddStat('Least Played', least.player, least.totalIn);
    this.meta.AddStat('Longest Play Streak', longestIn.player, longestIn.longestIn);
    this.meta.AddStat('Shortest Play Streak', shortestIn.player, shortestIn.shortestIn);
    this.meta.AddStat('Longest Bench Streak', longestOut.player, longestOut.longestOut);
    this.meta.AddStat('Shortest Bench Streak', shortestOut.player, shortestOut.shortestOut);
    this.meta.AddStat('Highest Average Play Streak', longestAvgIn.player, longestAvgIn.averageIn);
    this.meta.AddStat('Lowest Average Play Streak', shortestAvgIn.player, shortestAvgIn.averageIn);
    this.meta.AddStat('Highest Average Bench Streak', longestAvgOut.player, longestAvgOut.averageOut);
    this.meta.AddStat('Lowest Average Bench Streak', shortestAvgOut.player, shortestAvgOut.averageOut);
  }
  IsCarryover(allMatches: Match[], carryover: number, team1: Team, team2: Team) {
    for (let i = 0; i < carryover; i++) {
      if ((allMatches[i].team1.Is(team1) || allMatches[i].team2.Is(team1))
        && (allMatches[i].team1.Is(team2) || allMatches[i].team2.Is(team2))) {
          return true;
        }
    }
    return false;
  }
  BuildBracket() {
    this.isDirty = false;
    const teams = [];
    const allMatches = [];
    for (let i = 0; i < this.matches.length; i++) {
      if (this.done[i]) {
        allMatches.push(this.matches[i]);
      }
    }

    const carryover = allMatches.length;
    this.allPlayers = [];
    this.matches = [];
    this.matches.length = 0;
    this.done = [];
    this.done.length = 0;

    for (let i = 0; i < this.entities.length; i++) {
      this.entities[i].Reset();
      this.allPlayers.push(this.entities[i]);
      for (let j = i + 1; j < this.entities.length; j++) {
        teams.push(new Team(this.entities[i], this.entities[j]));
      }
    }
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        if (teams[i].CanPlay(teams[j]) && !this.IsCarryover(allMatches, carryover, teams[i], teams[j])) {
          allMatches.push(new Match(teams[i], teams[j]));
        }
      }
    }

    for (let i = 0; i < carryover; i++) {
      this.RunMatch(allMatches, allMatches[0]);
    }
    while (allMatches.length > 0) {
      const round = this.matches.length;
      let nextMatch = allMatches[0];
      for (let i = 1; i < allMatches.length; i++) {
        const match = allMatches[i];
        const nextPlayerStaleness = nextMatch;
        if (match.PlayerStaleness(round) > nextMatch.PlayerStaleness(round)) {
          nextMatch = match;
        } else if (match.PlayerStaleness(round) === nextMatch.PlayerStaleness(round)) {
          if (match.TeamStaleness(round) > nextMatch.TeamStaleness(round)) {
            nextMatch = match;
          }
        }
      }
      this.RunMatch(allMatches, nextMatch);
    }
    for (let i = 0; i < this.matches.length; i++) {
      this.done.push(i < carryover);
    }
    this.Analyze();
  }
}
