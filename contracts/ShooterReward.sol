// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title ShooterReward
/// @notice "Base Shooter" ゲームのスコア報酬NFT。
///         一定スコア以上を獲得したプレイヤーだけがミントできる。
///         画像・メタデータは外部サービスを使わず、すべてチェーン上で生成する。
contract ShooterReward is ERC721Enumerable {
    /// @notice ミントに必要な最低スコア
    uint256 public constant MINT_THRESHOLD = 100;

    uint256 private _nextTokenId = 1;

    /// @notice トークンIDごとのスコア
    mapping(uint256 => uint256) public scoreOf;

    event RewardMinted(address indexed player, uint256 indexed tokenId, uint256 score);

    constructor() ERC721("Base Shooter Reward", "BSHOOT") {}

    /// @notice ゲーム終了後にスコアを渡してNFTをミントする
    /// @param _score プレイ結果のスコア（クライアント側で計測した値）
    function mintReward(uint256 _score) external returns (uint256) {
        require(_score >= MINT_THRESHOLD, "Score too low to mint");

        uint256 tokenId = _nextTokenId++;
        scoreOf[tokenId] = _score;
        _safeMint(msg.sender, tokenId);

        emit RewardMinted(msg.sender, tokenId, _score);
        return tokenId;
    }

    function _rank(uint256 score) internal pure returns (string memory) {
        if (score >= 500) return "Diamond";
        if (score >= 300) return "Gold";
        if (score >= 150) return "Silver";
        return "Bronze";
    }

    function _color(uint256 score) internal pure returns (string memory) {
        if (score >= 500) return "#7DD3FC";
        if (score >= 300) return "#FACC15";
        if (score >= 150) return "#D1D5DB";
        return "#C2845C";
    }

    /// @notice トークンごとのメタデータ（JSON + SVG画像）をオンチェーンで生成する
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");

        uint256 score = scoreOf[tokenId];
        string memory rank = _rank(score);
        string memory color = _color(score);
        string memory scoreStr = Strings.toString(score);

        string memory svg = string(
            abi.encodePacked(
                "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>",
                "<rect width='400' height='400' fill='#0A0B0D'/>",
                "<circle cx='200' cy='150' r='60' fill='", color, "'/>",
                "<text x='200' y='260' font-size='28' fill='white' text-anchor='middle' font-family='monospace'>", rank, "</text>",
                "<text x='200' y='300' font-size='20' fill='#8A8F98' text-anchor='middle' font-family='monospace'>SCORE ", scoreStr, "</text>",
                "</svg>"
            )
        );

        string memory json = string(
            abi.encodePacked(
                '{"name":"Base Shooter Reward #', Strings.toString(tokenId),
                '","description":"Proof of a high score earned in the Base Shooter game, recorded fully on-chain.",
                '","attributes":[{"trait_type":"Score","value":', scoreStr,
                '},{"trait_type":"Rank","value":"', rank, '"}],',
                '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }
}
