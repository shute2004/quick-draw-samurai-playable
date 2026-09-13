function byId(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Missing required element #${id}`);
    return element;
}
export function getGameDom() {
    return {
        stage: byId('stage'), canvas: byId('cv'), wins: byId('winsVal'), hint: byId('hudHint'), score: byId('scoreVal'), best: byId('hudBest'),
        hudRoundLabel: byId('hudRoundLabel'), hudRoundUnit: byId('hudRoundUnit'), hudScoreLabel: byId('hudScoreLabel'),
        intro: byId('roundIntro'), riCount: byId('riCount'), riMain: byId('riMain'), riHint: byId('riHint'), stamp: byId('stamp'), hintBar: byId('hintBar'),
        title: byId('title'), result: byId('result'), titleTag: byId('tTag'), titleName: byId('tName'),
        rules: [byId('tRule1'), byId('tRule2'), byId('tRule3'), byId('tRule4')], titleGo: byId('tGo'), titleBest: byId('tBest'),
        resultTag: byId('rTag'), resultWinsLabel: byId('rWinsLbl'), resultWins: byId('rWinsVal'), resultWinsUnit: byId('rWinsUnit'), resultScoreLabel: byId('rScoreLabel'), resultScore: byId('rScoreVal'),
        resultRank: byId('rRank'), resultRankLine: byId('rRankLine'), resultNames: byId('rNames'), resultBest: byId('rBest'), resultGo: byId('rGo'), rewardContinue: byId('rewardContinue'),
        bgmButton: byId('bgmBtn'), sfxButton: byId('muteBtn'), resultFrame: byId('rFrame')
    };
}
