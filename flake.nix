{
  description = "Golem Team Time Tracker - Toggl killer built on Golem + Effect";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        version = "1.5.0-rc3";

        golemBinaries = {
          x86_64-linux = {
            golem = {
              url = "https://github.com/golemcloud/golem/releases/download/v${version}/golem-x86_64-unknown-linux-gnu";
              sha256 = "1zmkhnpsa0vpdlpjvdqg6rwgxzqjqjg59c9w65cyrxnxdps9r6ii";
            };
            golem-cli = {
              url = "https://github.com/golemcloud/golem/releases/download/v${version}/golem-cli-x86_64-unknown-linux-gnu";
              sha256 = "1di3dj20h09ijlix10ax9srxd6ljfiag8ji6s5kl18big4mh9kg7";
            };
          };
          aarch64-linux = {
            golem = {
              url = "https://github.com/golemcloud/golem/releases/download/v${version}/golem-aarch64-unknown-linux-gnu";
              sha256 = pkgs.lib.fakeHash;
            };
            golem-cli = {
              url = "https://github.com/golemcloud/golem/releases/download/v${version}/golem-cli-aarch64-unknown-linux-gnu";
              sha256 = pkgs.lib.fakeHash;
            };
          };
          x86_64-darwin = {
            golem = {
              url = "https://github.com/golemcloud/golem/releases/download/v${version}/golem-x86_64-apple-darwin";
              sha256 = pkgs.lib.fakeHash;
            };
            golem-cli = {
              url = "https://github.com/golemcloud/golem/releases/download/v${version}/golem-cli-x86_64-apple-darwin";
              sha256 = pkgs.lib.fakeHash;
            };
          };
          aarch64-darwin = {
            golem = {
              url = "https://github.com/golemcloud/golem/releases/download/v${version}/golem-aarch64-apple-darwin";
              sha256 = pkgs.lib.fakeHash;
            };
            golem-cli = {
              url = "https://github.com/golemcloud/golem/releases/download/v${version}/golem-cli-aarch64-apple-darwin";
              sha256 = pkgs.lib.fakeHash;
            };
          };
        };

        mkGolemBin = name: { url, sha256 }:
          pkgs.stdenv.mkDerivation {
            pname = name;
            inherit version;
            src = pkgs.fetchurl { inherit url sha256; };
            nativeBuildInputs = [ pkgs.autoPatchelfHook ];
            buildInputs = [
              pkgs.openssl
              pkgs.stdenv.cc.cc.lib
            ];
            dontUnpack = true;
            installPhase = ''
              mkdir -p $out/bin
              cp $src $out/bin/${name}
              chmod +x $out/bin/${name}
            '';
          };

        bins = golemBinaries.${system} or (throw "Unsupported system: ${system}");

        golem-full = mkGolemBin "golem" bins.golem;
        golem-cli = mkGolemBin "golem-cli" bins.golem-cli;

      in {
        packages = {
          inherit golem-full golem-cli;
          default = golem-full;
        };

        devShells.default = pkgs.mkShell {
          name = "golem-time-tracker";

          packages = [
            # Golem tooling
            golem-full
            golem-cli

            # TypeScript / Node.js for CLI client (golem requires >= 24.11.0)
            pkgs.nodejs_24
            # npm bundled with nodejs

            # Build tools
            pkgs.curl
            pkgs.jq
          ];

          shellHook = ''
            echo "Golem Team Time Tracker dev environment"
            echo "  golem     $(golem --version 2>/dev/null || echo 'not available')"
            echo "  node      $(node --version)"
            echo "  npm       $(npm --version)"
          '';
        };
      }
    );
}
