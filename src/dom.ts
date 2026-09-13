function byId<T extends HTMLElement>(id:string):T{
  const element=document.getElementById(id);
  if(!element)throw new Error(`Missing required element #${id}`);
  return element as T;
}

export interface GameDom {
  stage:HTMLDivElement; canvas:HTMLCanvasElement;
  wins:HTMLElement; hint:HTMLElement; score:HTMLElement; best:HTMLElement;
  hudRoundLabel:HTMLElement; hudRoundUnit:HTMLElement; hudScoreLabel:HTMLElement;
  intro:HTMLDivElement; riCount:HTMLElement; riMain:HTMLElement; riHint:HTMLElement;
  stamp:HTMLDivElement; hintBar:HTMLDivElement; title:HTMLDivElement; result:HTMLDivElement;
  titleTag:HTMLElement; titleName:HTMLElement; rules:[HTMLElement,HTMLElement,HTMLElement,HTMLElement]; titleGo:HTMLElement; titleBest:HTMLElement;
  resultTag:HTMLElement; resultWinsLabel:HTMLElement; resultWins:HTMLElement; resultWinsUnit:HTMLElement;
  resultScoreLabel:HTMLElement; resultScore:HTMLElement; resultRank:HTMLElement; resultRankLine:HTMLElement; resultNames:HTMLElement; resultBest:HTMLElement; resultGo:HTMLElement;
  rewardContinue:HTMLButtonElement; bgmButton:HTMLButtonElement; sfxButton:HTMLButtonElement; resultFrame:HTMLDivElement;
}

export function getGameDom():GameDom{
  return {
    stage:byId<HTMLDivElement>('stage'),canvas:byId<HTMLCanvasElement>('cv'),wins:byId('winsVal'),hint:byId('hudHint'),score:byId('scoreVal'),best:byId('hudBest'),
    hudRoundLabel:byId('hudRoundLabel'),hudRoundUnit:byId('hudRoundUnit'),hudScoreLabel:byId('hudScoreLabel'),
    intro:byId<HTMLDivElement>('roundIntro'),riCount:byId('riCount'),riMain:byId('riMain'),riHint:byId('riHint'),stamp:byId<HTMLDivElement>('stamp'),hintBar:byId<HTMLDivElement>('hintBar'),
    title:byId<HTMLDivElement>('title'),result:byId<HTMLDivElement>('result'),titleTag:byId('tTag'),titleName:byId('tName'),
    rules:[byId('tRule1'),byId('tRule2'),byId('tRule3'),byId('tRule4')],titleGo:byId('tGo'),titleBest:byId('tBest'),
    resultTag:byId('rTag'),resultWinsLabel:byId('rWinsLbl'),resultWins:byId('rWinsVal'),resultWinsUnit:byId('rWinsUnit'),resultScoreLabel:byId('rScoreLabel'),resultScore:byId('rScoreVal'),
    resultRank:byId('rRank'),resultRankLine:byId('rRankLine'),resultNames:byId('rNames'),resultBest:byId('rBest'),resultGo:byId('rGo'),rewardContinue:byId<HTMLButtonElement>('rewardContinue'),
    bgmButton:byId<HTMLButtonElement>('bgmBtn'),sfxButton:byId<HTMLButtonElement>('muteBtn'),resultFrame:byId<HTMLDivElement>('rFrame')
  };
}
