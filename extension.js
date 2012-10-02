/*
 * 
 * My First Gnome Shell extension . Yayyyyyy :)
 * 
 * Cricket Live Score Gnome Shell Extension
 *	- Displays live score on top panel
 *	- On click, displays more information
 *
 * Copyright (C) 2012
 *	- Rajesh KSV <rajeshksv37@gmail.com>
 *
 * This file is part of gnome-shell-extension-cricketlivescore
 *
 * Inspired from gnome-shell-extension-weater - https://github.com/ecyrbe/gnome-shell-extension-weather
 *
 * gnome-shell-extension-cricketlivescore is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * gnome-shell-extension-cricketlivescore is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gnome-shell-extension-cricketlivescore.  If not, see <http://www.gnu.org/licenses/>

 * Known Issues 
 * When network disconnects in between, extension may not work till gnome shell reloads

 */


const Cairo = imports.cairo;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Soup = imports.gi.Soup;
const St = imports.gi.St;
const Util = imports.misc.util;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());


function cricketScoreButton() {
    this._init();
}


cricketScoreButton.prototype = {
  __proto__: PanelMenu.Button.prototype,

  _init: function() {
    PanelMenu.Button.prototype._init.call(this, 0.25);

    let topBox = new St.BoxLayout();
    this._scoreInfo = new St.Label({ text: _('Loading.....') });
    topBox.add_actor(this._scoreInfo);
    this.actor.add_actor(topBox);

    Main.panel._centerBox.add(this.actor, { y_fill: true });
    Main.panel._menus.addMenu(this.menu);

   let mainBox = new St.BoxLayout({ vertical: true });
   this._moreInfo = new St.Bin();
   this._refreshedDate = new St.Bin();
   this._separatorArea = new St.DrawingArea({ style_class: 'popup-separator-menu-item' });
   this._separatorArea.width = 200;
   this._separatorArea.connect('repaint', Lang.bind(this, this._onSeparatorAreaRepaint));
   mainBox.add_actor(this._moreInfo);
   mainBox.add_actor(this._separatorArea);
   mainBox.add_actor(this._refreshedDate);
   this.menu.addActor(mainBox);

   this.menu.addActor(this._scoreInfo);

   this.showLoadingUi();

  Mainloop.timeout_add_seconds(3, Lang.bind(this, function() {
      this.refreshScore(true);
  }));

  },

    destroyCurrentInfo: function() {
        if (this._moreInfo.get_child() != null) {
            this._moreInfo.get_child().destroy();
         }   
        if(this._refreshedDate.get_child() != null) {
           this._refreshedDate.get_child().destroy();
          }
    },


        load_xml_async: function(url, fun) {
        let here = this;
        let message = Soup.Message.new('GET', url);
        _httpSession.queue_message(message, function(session, message) {
           if (message.status_code !== 200) {
                global.log("curl failed");
               return;
             }
            fun.call(here,message.response_body.data) ;
        });
    },


    refreshScore: function(recurse) {
        url = "http://synd.cricbuzz.com/j2me/1.0/livematches.xml";
        this.load_xml_async(url , function(content) {
            try {
              // ECMA Script for XML (E4X)
             let oxml  = new XML(content);
              i=0;
              while(typeof(oxml.match[i]) != 'undefined'){
                        var d  = new Date();
                        var hrs = (d.getHours() < 10) ? ("0" + d.getHours()) : d.getHours();
                        var min = (d.getMinutes() < 10) ? ("0" + d.getMinutes()) : d.getMinutes();
                        var sec = (d.getSeconds() < 10) ? ("0" + d.getSeconds()) : d.getSeconds();
                        var currentTime = hrs + " : " + min + " : " + sec + " IST ";
                        if(oxml.match[i].state.@mchState == "preview") {
                          let team1 = oxml.match[i].Tm[0].@sName.toString();
                          let team2 = oxml.match[i].Tm[1].@sName.toString();
                          let status = oxml.match[i].state.@status;
                          this._scoreInfo.text = team1 + " vs " + team2 + " ( "  + status + "  ) ";
                          this._moreInfo.get_child().text = "Dont waste your time ! No Live match is going on " ; 
                          this._refreshedDate.get_child().text = "  Last Refreshed on   " + currentTime; 
                        } else { 
                               let team1 = oxml.match[i].mscr.btTm.@sName.toString();
                               let team2 = oxml.match[i].mscr.blgTm.@sName.toString();
                               let score1 = oxml.match[i].mscr.btTm.Inngs;
                               let score2 = oxml.match[i].mscr.blgTm.Inngs;
                               let more = oxml.match[i].mscr.inngsdetail;
                               //let link = oxml.match[i].child("url-link").@href;
                                this._scoreInfo.text = team1  +  " - " + score1.@r.toString() + " / " + score1.@wkts.toString() + " ( "  + score1.@ovrs.toString() + " )  vs " + team2 ;
                                var hasScore= (oxml.match[i].mscr.blgTm.children().length() > 0);
                                if(!hasScore) { 
                                        this._scoreInfo.text += " - " + score2.@r.toString() + " / " + score2.@wkts.toString() + " ( "  + score2.@ovrs.toString() + " ) ";
                                 }       

                                 let moreInfo = "";
                                 let requiredRR = more.@rrr.toString();
                                 if(requiredRR != "") { 
                                    let moreInfo = "Required RunRate   : " + requiredRR + "\n\n";
                                }
                                moreInfo  += "Current RunRate   : " + more.@crr.toString();
                                moreInfo += "\n\n" + "Current PrtnrShip : " + more.@cprtshp.toString();
                                let refreshedDate  =  "Last Refreshed on  " + currentTime;
                                this._moreInfo.get_child().text = moreInfo;
                                this._refreshedDate.get_child().text = refreshedDate;
                        }
                  break;
              }

            }
            catch(e){
                global.log('A ' + e.name + ' has occured: ' + e.message);
            }
            if(recurse) {
                     Mainloop.timeout_add_seconds(3, Lang.bind(this, function() {
                     this.refreshScore(true);
                   }));
           }

    });

    },


      showLoadingUi: function() {
         this.destroyCurrentInfo();
         this._moreInfo.set_child(new St.Label({ style_class:'moreInfo' , text: _('Loading More Info ...') }));
        this._refreshedDate.set_child(new St.Label({ style_class:'moreInfo' , text: _('Loading  Last Refreshed Date...') }));

    },

        // Copied from Gnome shell's popupMenu.js
    _onSeparatorAreaRepaint: function(area) {
        let cr = area.get_context();
        let themeNode = area.get_theme_node();
        let [width, height] = area.get_surface_size();
        let margin = themeNode.get_length('-margin-horizontal');
        let gradientHeight = themeNode.get_length('-gradient-height');
        let startColor = themeNode.get_color('-gradient-start');
        let endColor = themeNode.get_color('-gradient-end');

        let gradientWidth = (width - margin * 2);
        let gradientOffset = (height - gradientHeight) / 2;
        let pattern = new Cairo.LinearGradient(margin, gradientOffset, width - margin, gradientOffset + gradientHeight);
        pattern.addColorStopRGBA(0, startColor.red / 255, startColor.green / 255, startColor.blue / 255, startColor.alpha / 255);
        pattern.addColorStopRGBA(0.5, endColor.red / 255, endColor.green / 255, endColor.blue / 255, endColor.alpha / 255);
        pattern.addColorStopRGBA(1, startColor.red / 255, startColor.green / 255, startColor.blue / 255, startColor.alpha / 255);
        cr.setSource(pattern);
        cr.rectangle(margin, gradientOffset, gradientWidth, gradientHeight);
        cr.fill();
    }

}

let cricketScore;
function init() {
}

function enable() {
    cricketScore = new cricketScoreButton();
    Main.panel.addToStatusArea('cricketMenu', cricketScore);
}

function disable() {
  cricketScore.destroy();
}
