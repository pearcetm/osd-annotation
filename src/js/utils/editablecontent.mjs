/**
 * OpenSeadragon canvas Overlay plugin based on paper.js
 * @version 0.3.0
 * 
 * Includes additional open source libraries which are subject to copyright notices
 * as indicated accompanying those segments of code.
 * 
 * Original code:
 * Copyright (c) 2022-2024, Thomas Pearce
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * 
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 * 
 * * Neither the name of paper-overlay nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 */

export class EditableContent{
    constructor(opts){
        let defaultOpts = {
            initialContent:'Enter text...',
        }
        opts = Object.assign({}, defaultOpts, opts);

        this._element = document.createElement('span');
        this._ec = document.createElement('span');
        this._button = document.createElement('span');
        this._element.appendChild(this._ec);
        this._element.appendChild(this._button);
        this._oldtext='';

        this._element.classList.add('editablecontent');
        this._ec.classList.add('text-content');
        this._button.classList.add('fa', 'fa-edit', 'edit-button', 'onhover');

        this._ec.textContent = opts.initialContent;
        //this._ec.setAttribute('contenteditable',true);

        this._element.addEventListener('focusout',()=>{
            if(!this._element.classList.contains('editing')){
                return;
            }
            let newtext = this._ec.textContent.trim();
            if(newtext !== this.oldtext){
                this.onChanged && this.onChanged(newtext);
            }
            this._element.classList.remove('editing');
            this._ec.setAttribute('contenteditable',false);
        });

        this._element.addEventListener('keypress',ev=>{
            if(!this._element.classList.contains('editing')){
                return;
            }
            ev.stopPropagation();
            if(ev.key=='Enter'){
                ev.preventDefault();
                this._ec.blur();
            }
        });

        this._element.addEventListener('keydown keyup',ev=>{
            if(!this._element.classList.contains('editing')){
                return;
            }
            ev.stopPropagation();
        });

        this._button.addEventListener('click',()=>this._editClicked());


    }
    get element(){
        return this._element;
    }
    get onChanged(){
        return this._onChanged;
    }
    set onChanged(func){
        if(typeof func === 'function' || func === null){
            this._onChanged=func;
        } else {
            throw('Value must be a function or null');
        }
    }
    setText(text){
        this._ec.textContent = text;
    }
    _editClicked(){
        this._element.classList.add('editing');
        this._ec.setAttribute('contenteditable',true);
        this._oldtext = this._ec.textContent.trim();
        let range = document.createRange();
        range.selectNodeContents(this._ec);
        let selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        // let header = this._element.find('.editablecontent');
        // header.addClass('editing');
        // let ce = header.find('.edit').attr('contenteditable',true).focus();
        // ce.data('previous-text',ce.text());
        // let range = document.createRange();
        // range.selectNodeContents(ce[0]);
        // let selection = window.getSelection();
        // selection.removeAllRanges();
        // selection.addRange(range);
    }
}