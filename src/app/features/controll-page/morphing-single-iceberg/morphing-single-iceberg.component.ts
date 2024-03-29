import {
  Component,
  ElementRef,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
  ChangeDetectorRef,
  Input,
  OnChanges, SimpleChanges
} from '@angular/core';
import {IcebergParams} from "../../../entity/Icebergparams";
import {IceBergConfig} from "../../../entity/IceBergConfig";
import {Polygon} from "two.js/src/shapes/polygon";
import TWEEN from "@tweenjs/tween.js";
import {EisbergService} from "../../../services/vis-services/eisberg.service";
import {ModelOutputs} from "../../../entity/ModelOutput";
import Two from "two.js";
import {CCCOutputToMorph} from "../../../shared/components/canvasjs-cancer/canvasjs-cancer.component";
import {BackendService} from "../../../services/backend-service/backend.service";
import {MorphService} from "../../../services/vis-services/morph.service";
import {Group} from "two.js/src/group";
import {Observable} from "rxjs";

export interface DurationsInMs{
  oneIcebergDuration:number;
  animDuration:number;
  delayDuration:number;
}

@Component({
  selector: 'app-morphing-single-iceberg',
  templateUrl: './morphing-single-iceberg.component.html',
  styleUrls: ['./morphing-single-iceberg.component.scss']
})

export class MorphingSingleIcebergComponent implements OnInit, OnChanges {
  @ViewChild('iceberg') myDiv?: ElementRef;
  @Output() data: EventEmitter<any> = new EventEmitter<any>();
  @Output() cccOutPut: EventEmitter<CCCOutputToMorph> = new EventEmitter<CCCOutputToMorph>();
  @Input() morphingInput?: Observable<CCCOutputToMorph>;
  @Input() showCharts?: Observable<boolean>;

  show_charts = false;

  modelOutputs: ModelOutputs = {
    sampleRate: 44100,
    durationInSec: 201.3,
    outputCount: 200,
    modelOutputs: [],
  }

  //output from ccc
  cccOutputToMorph : CCCOutputToMorph = {
    start: false,
    restart:false,
    selected: false,
    currentSec: 0,
    audioBuffered: false,
    selectedIceParams: undefined,
    outputs: undefined
  }

  //anim durations calculate from modeloutputs and outputcount
  durationsInMs : DurationsInMs={
    oneIcebergDuration : this.modelOutputs.durationInSec/this.modelOutputs.outputCount*1000,
    animDuration: this.modelOutputs.durationInSec/this.modelOutputs.outputCount*1000*0.2,
    delayDuration: this.modelOutputs.durationInSec/this.modelOutputs.outputCount*1000*0.8,
  }

  //two objects
  twoCanvas = new Two();
  isLoadin = true;
  eisberg = new Group();

  //json array stuff and counter for where we are
  public jsonArray: any;
  public counterJson = 0;

  //the tween animation as variable so we can stop it
  public t1 = new TWEEN.Tween(this.eisberg.children[0])

  constructor(private es: EisbergService, private backend: BackendService, private  morph: MorphService) {

  }

  ngOnInit(): void {
    this.morphingInput?.subscribe(
      (next) => {
        this.onPlayMorph(next)
      }
    );

    this.showCharts?.subscribe((next) => {
      this.show_charts = next;
    })

  }

  ngAfterViewInit(): void{
    var params = {fitted:true}
    var elem = this.myDiv?.nativeElement;
    this.twoCanvas = new Two(params).appendTo(elem)

  }

  ngOnChanges(changes: SimpleChanges) {
    let mi = changes["morphingInput"].currentValue
    if(mi != null){
      console.log(mi)
    }
  }



  onPlayMorph($event: CCCOutputToMorph) {
    this.cccOutputToMorph = $event
    //console.log(this.cccOutputToMorph)

    if(this.cccOutputToMorph.outputs!=undefined && this.modelOutputs!=this.cccOutputToMorph.outputs){
      this.setOutputsAndUpdate(this.cccOutputToMorph)
    }

    if(this.cccOutputToMorph.selectedIceParams!=undefined&&this.cccOutputToMorph.selected && this.cccOutputToMorph.currentSec!=0){
      this.twoCanvas.clear()
      this.t1.stop()
      let iceConf = this.es.genIceConfs([this.cccOutputToMorph.selectedIceParams])[0]
      this.eisberg = this.es.generateEisberg(200, 300, 240, iceConf)
      this.twoCanvas.add(this.eisberg)
      this.twoCanvas.update()
      return
    }

    if(!this.isLoadin&&this.cccOutputToMorph.audioBuffered) {
      if (this.cccOutputToMorph.currentSec != 0) {
        //get our current iceberg according to sec, delay for some left time
        const delayAndIndex = this.morph.calcCurrentIcebergIndex(this.cccOutputToMorph.currentSec, this.modelOutputs.durationInSec, this.modelOutputs.outputCount, this.durationsInMs.oneIcebergDuration)
        this.t1.delay(delayAndIndex[0])
        this.counterJson = delayAndIndex[1]
      }
      if (this.cccOutputToMorph.start) {
        //clear previous polys and restart anim
        this.twoCanvas.clear()
        this.morphNext()
        return
      } else {
        if (this.cccOutputToMorph.restart ) {
          //restart so reset counter to 0 and stop
          this.t1.stop()
          this.counterJson = 0;
        }else{
          this.t1.stop()
        }
        //else stop it
      }
    }
  }

  morphNext(){
    //generate the iceconfs
    if(this.counterJson<this.jsonArray.length-1){
      const [iceConfigOld, iceConfigNew] = this.es.genIceConfs([this.jsonArray[this.counterJson], this.jsonArray[this.counterJson+1]])
      const [emoOld, emoNew] = [this.jsonArray[this.counterJson].emotion, this.jsonArray[this.counterJson+1].emotion]
      //this.morph.genIceConfs(this.jsonArray, this.counterJson)

      this.counterJson++

      let iceNew  = this.genCurrentAndNextIceberg(iceConfigOld, iceConfigNew)

      this.morphIcebergToAnother(this.eisberg.children[0] , iceNew.children[0], iceConfigOld.params, iceConfigNew.params)
    } else{
      this.t1.stop()
      let iceConfLast = this.es.genIceConfs([this.jsonArray[this.jsonArray.length-1]])[0]
      this.eisberg = this.es.generateEisberg(200, 300, 240, iceConfLast)
      this.twoCanvas.add(this.eisberg)
      this.twoCanvas.update()
    }
  }

  //tween animation for morphing
  private morphIcebergToAnother(poly:Polygon,
                                poly2: Polygon,
                                params1: IcebergParams, params2: IcebergParams) {
    let thisObject = this;
    //what poly u want to animate then what properties
    this.t1 = new TWEEN.Tween(poly).to({skewX:poly2.skewX, height: poly2.height, position: poly2.position}, this.durationsInMs.animDuration).easing(
      TWEEN.Easing.Quadratic.Out)
      //here comes the parameters we want to change/watch
      .onUpdate(function(poly: Polygon,elapsed:number){
        let currParams = thisObject.es.genStepComplexParams(params1, params2, elapsed)
        poly.fill = thisObject.es.getGradFromParams(currParams);
        //poly.stroke = thisObject.es.getBorderFromParams(currParams);

        return poly;
      }).onComplete(()=>{
        this.eisberg.remove()
        this.morphNext()})
      .delay(this.durationsInMs.delayDuration)
      .start()  //delay the animation

    //bind the update function so play gets called
    this.bindTweenUpdateToCanvas()
  }

  private genCurrentAndNextIceberg(iceConfigOld: IceBergConfig, iceConfigNew: IceBergConfig): Group {
    this.eisberg = this.es.generateEisberg(200, 300, 240, iceConfigOld)

    this.twoCanvas.add(this.eisberg)

    return this.es.generateEisberg(200, 300, 240, iceConfigNew)
  }

  private bindTweenUpdateToCanvas() {
    this.twoCanvas.bind('update', function (){
      TWEEN.update();
    }).play()
  }

  private updateDurations(){
    this.durationsInMs = {
      oneIcebergDuration: this.modelOutputs.durationInSec / this.modelOutputs.outputCount * 1000,
      animDuration: this.modelOutputs.durationInSec / this.modelOutputs.outputCount * 1000 * 0.2,
      delayDuration: this.modelOutputs.durationInSec / this.modelOutputs.outputCount * 1000 * 0.8,
    }
  }

  private setOutputsAndUpdate(cccOutputToMorph: CCCOutputToMorph){

    this.jsonArray = cccOutputToMorph.outputs!.modelOutputs
    this.modelOutputs= cccOutputToMorph.outputs!
    this.updateDurations()
    this.data.emit(this.jsonArray)
    this.cccOutPut.emit(cccOutputToMorph)
    this.isLoadin=false
  }

  public isLoadingBackend($event: boolean){
    this.isLoadin=$event
  }
}

