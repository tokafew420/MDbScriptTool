(function (CodeMirror) {
    'use strict';

    CodeMirror.registerHelper('fold', 'tsql', function (cm, start) {
        let line = start.line;
        let lineText = cm.getLine(line).toLowerCase();
        let tokenType;
        let startToken = 'begin';
        let endToken = 'end';
        console.log(start);
        function findOpening(token, len) {
            // Start from end
            let at = lineText.length;

            for (; ;) {
                var idx = lineText.lastIndexOf(token, at - len);
                if (idx === -1) {
                    return -1;
                }
                tokenType = cm.getTokenTypeAt(CodeMirror.Pos(line, idx + len));

                if (!/^(comment|string)/.test(tokenType)) {
                    // Add length so fold shows first keyword
                    return idx + len;
                }
                at = idx;
            }
        }

        let startCh = findOpening(startToken, startToken.length);
        if (startCh === -1) {
            startToken = 'case';
            startCh = findOpening(startToken, startToken.length);
        }

        if (startCh === -1) return;
        let count = 1;
        let lastLine = cm.lastLine();
        let end = -1;
        let endCh;

        outer: for (var i = line; i <= lastLine; ++i) {
            let text = cm.getLine(i).toLowerCase();
            let len = text.length;
            let pos = i === line ? startCh : 0;

            for (; ;) {
                let nextOpen = text.indexOf('begin', pos);
                let nextClose = text.indexOf(endToken, pos);

                if (nextOpen === -1) {
                    nextOpen = text.indexOf('case', pos);
                    if (nextOpen === -1) {
                        nextOpen = len;
                    }
                }
                if (nextClose === -1) nextClose = len;

                pos = Math.min(nextOpen, nextClose);

                if (pos === len) break;

                if (cm.getTokenTypeAt(CodeMirror.Pos(i, pos + 3)) === tokenType) {
                    if (pos === nextOpen) {
                        ++count;
                    } else if (!--count) {
                        end = i;
                        endCh = pos;
                        break outer;
                    }
                }
                ++pos;
            }
        }
        // If not found or on same line then no fold
        if (end === -1 || line === end) return;
        console.log({
            from: CodeMirror.Pos(line, startCh),
            to: CodeMirror.Pos(end, endCh)
        });
        return {
            from: CodeMirror.Pos(line, startCh),
            to: CodeMirror.Pos(end, endCh)
        };
    });
})(CodeMirror);
